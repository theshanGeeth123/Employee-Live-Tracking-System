const Task = require("../models/Task");
const User = require("../models/User");

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const getCurrentUserId = (req) => {
  return req.user?._id || req.user?.id || req.user?.userId;
};

const getIdString = (value) => {
  if (!value) return "";
  return String(value._id || value.id || value);
};

const getUserName = (user) => {
  if (!user) return "Unknown User";

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    user.name ||
    user.fullName ||
    user.username ||
    fullName ||
    user.email ||
    "Unknown User"
  );
};

const isAdminOrManager = (user) => {
  return user?.role === "admin" || user?.role === "manager";
};

const emitSocketEvent = (req, eventName, payload) => {
  const io = req.app.get("io");
  if (io) io.emit(eventName, payload);
};

const normalizeAssignedTo = (assignedTo) => {
  if (!assignedTo) return [];

  const rawList = Array.isArray(assignedTo) ? assignedTo : [assignedTo];

  const cleaned = rawList
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return [...new Set(cleaned)];
};

const userIsAssignedToTask = (task, userId) => {
  const currentUserId = String(userId);

  const assignedList = Array.isArray(task.assignedTo)
    ? task.assignedTo
    : task.assignedTo
    ? [task.assignedTo]
    : [];

  return assignedList.some((item) => getIdString(item) === currentUserId);
};

const populateTask = (query) => {
  return query
    .populate(
      "assignedTo",
      "name fullName firstName lastName username email role status isActive"
    )
    .populate(
      "assignedBy",
      "name fullName firstName lastName username email role"
    );
};

const formatTask = (task) => {
  if (!task) return null;

  const assignedTo = Array.isArray(task.assignedTo)
    ? task.assignedTo
    : task.assignedTo
    ? [task.assignedTo]
    : [];

  return {
    _id: task._id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate,
    status: task.status,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    cancelledAt: task.cancelledAt,
    completionRemark: task.completionRemark,
    assignedTo,
    assignedToCount: assignedTo.length,
    assignedBy: task.assignedBy,
    notes: task.notes || [],
    statusHistory: task.statusHistory || [],
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
};

const validateAssignedUsers = async (assignedToIds) => {
  if (!assignedToIds.length) {
    return {
      valid: false,
      message: "Please select at least one employee",
      users: [],
    };
  }

  const users = await User.find({
    _id: { $in: assignedToIds },
  }).select("name fullName firstName lastName username email role status isActive");

  if (users.length !== assignedToIds.length) {
    return {
      valid: false,
      message: "One or more selected users were not found",
      users,
    };
  }

  const invalidUser = users.find(
    (user) => !["employee", "manager"].includes(user.role)
  );

  if (invalidUser) {
    return {
      valid: false,
      message: "Tasks can be assigned only to employees or managers",
      users,
    };
  }

  return {
    valid: true,
    message: "",
    users,
  };
};

// @desc    Get assignable users with search and role filter
// @route   GET /api/tasks/assignable-users?search=&role=all
// @access  Admin, Manager
exports.getAssignableUsers = async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return sendError(res, 403, "Access denied");
    }

    const { search = "", role = "all" } = req.query;

    const filter = {
      role: { $in: ["employee", "manager"] },
    };

    if (role && role !== "all") {
      if (!["employee", "manager"].includes(role)) {
        return sendError(res, 400, "Invalid role filter");
      }

      filter.role = role;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        { name: regex },
        { fullName: regex },
        { firstName: regex },
        { lastName: regex },
        { username: regex },
        { email: regex },
        { role: regex },
      ];
    }

    const users = await User.find(filter)
      .select("name fullName firstName lastName username email role status isActive")
      .sort({ role: 1, name: 1, email: 1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get assignable users error:", error);
    return sendError(res, 500, "Failed to load users");
  }
};

// @desc    Create task and assign to one or many users
// @route   POST /api/tasks
// @access  Admin, Manager
exports.createTask = async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return sendError(res, 403, "Only admin or manager can create tasks");
    }

    const currentUserId = getCurrentUserId(req);
    const { title, description, priority, dueDate } = req.body;
    const assignedToIds = normalizeAssignedTo(req.body.assignedTo);

    if (!title || !title.trim()) {
      return sendError(res, 400, "Task title is required");
    }

    const validation = await validateAssignedUsers(assignedToIds);

    if (!validation.valid) {
      return sendError(res, 400, validation.message);
    }

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || "",
      priority: priority || "medium",
      dueDate: dueDate || null,
      assignedTo: assignedToIds,
      assignedBy: currentUserId,
      status: "pending",
      statusHistory: [
        {
          status: "pending",
          changedBy: currentUserId,
          changedByName: getUserName(req.user),
          changedAt: new Date(),
        },
      ],
    });

    const createdTask = await populateTask(Task.findById(task._id));

    emitSocketEvent(req, "taskCreated", formatTask(createdTask));

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: formatTask(createdTask),
    });
  } catch (error) {
    console.error("Create task error:", error);
    return sendError(res, 500, "Failed to create task");
  }
};

// @desc    Get all tasks for admin/manager
// @route   GET /api/tasks/admin?status=all&assignedTo=all
// @access  Admin, Manager
exports.getAdminTasks = async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return sendError(res, 403, "Access denied");
    }

    const { status, assignedTo } = req.query;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (assignedTo && assignedTo !== "all") {
      filter.assignedTo = assignedTo;
    }

    const tasks = await populateTask(Task.find(filter).sort({ createdAt: -1 }));

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks: tasks.map(formatTask),
    });
  } catch (error) {
    console.error("Get admin tasks error:", error);
    return sendError(res, 500, "Failed to load tasks");
  }
};

// @desc    Get logged-in user assigned tasks
// @route   GET /api/tasks/my?status=all
// @access  Admin, Manager, Employee
exports.getMyTasks = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { status } = req.query;

    const filter = {
      assignedTo: currentUserId,
    };

    if (status && status !== "all") {
      filter.status = status;
    }

    const tasks = await populateTask(Task.find(filter).sort({ createdAt: -1 }));

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks: tasks.map(formatTask),
    });
  } catch (error) {
    console.error("Get my tasks error:", error);
    return sendError(res, 500, "Failed to load your tasks");
  }
};

// @desc    Get task by id
// @route   GET /api/tasks/:id
// @access  Admin, Manager, Assigned Employee
exports.getTaskById = async (req, res) => {
  try {
    const task = await populateTask(Task.findById(req.params.id));

    if (!task) {
      return sendError(res, 404, "Task not found");
    }

    const currentUserId = getCurrentUserId(req);

    if (!isAdminOrManager(req.user) && !userIsAssignedToTask(task, currentUserId)) {
      return sendError(res, 403, "Access denied");
    }

    return res.status(200).json({
      success: true,
      task: formatTask(task),
    });
  } catch (error) {
    console.error("Get task by id error:", error);
    return sendError(res, 500, "Failed to load task");
  }
};

// @desc    Admin update task details
// @route   PATCH /api/tasks/:id
// @access  Admin
exports.updateTask = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return sendError(res, 403, "Only admin can edit tasks");
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return sendError(res, 404, "Task not found");
    }

    if (["completed", "cancelled"].includes(task.status)) {
      return sendError(res, 400, "Completed or cancelled tasks cannot be edited");
    }

    const { title, description, priority, dueDate } = req.body;
    const assignedToIds = normalizeAssignedTo(req.body.assignedTo);

    if (!title || !title.trim()) {
      return sendError(res, 400, "Task title is required");
    }

    const validation = await validateAssignedUsers(assignedToIds);

    if (!validation.valid) {
      return sendError(res, 400, validation.message);
    }

    task.title = title.trim();
    task.description = description?.trim() || "";
    task.priority = priority || "medium";
    task.dueDate = dueDate || null;
    task.assignedTo = assignedToIds;

    await task.save();

    const updatedTask = await populateTask(Task.findById(task._id));

    emitSocketEvent(req, "taskUpdated", formatTask(updatedTask));

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task: formatTask(updatedTask),
    });
  } catch (error) {
    console.error("Update task error:", error);
    return sendError(res, 500, "Failed to update task");
  }
};

// @desc    Admin delete task
// @route   DELETE /api/tasks/:id
// @access  Admin
exports.deleteTask = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return sendError(res, 403, "Only admin can remove tasks");
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return sendError(res, 404, "Task not found");
    }

    const taskId = task._id;

    await Task.findByIdAndDelete(taskId);

    emitSocketEvent(req, "taskDeleted", {
      _id: taskId,
    });

    return res.status(200).json({
      success: true,
      message: "Task removed successfully",
      deletedTaskId: taskId,
    });
  } catch (error) {
    console.error("Delete task error:", error);
    return sendError(res, 500, "Failed to remove task");
  }
};

const updateTaskStatus = async (req, res, newStatus) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return sendError(res, 404, "Task not found");
    }

    const currentUserId = getCurrentUserId(req);

    if (!isAdminOrManager(req.user) && !userIsAssignedToTask(task, currentUserId)) {
      return sendError(res, 403, "Access denied");
    }

    if (task.status === "cancelled") {
      return sendError(res, 400, "Cancelled task cannot be updated");
    }

    if (task.status === "completed") {
      return sendError(res, 400, "Completed task cannot be updated");
    }

    if (newStatus === "cancelled" && !isAdminOrManager(req.user)) {
      return sendError(res, 403, "Only admin or manager can cancel tasks");
    }

    const now = new Date();

    task.status = newStatus;

    if (newStatus === "in-progress") {
      task.startedAt = task.startedAt || now;
    }

    if (newStatus === "completed") {
      task.completedAt = now;
      task.completionRemark = req.body?.completionRemark?.trim() || "";
    }

    if (newStatus === "cancelled") {
      task.cancelledAt = now;
    }

    task.statusHistory.push({
      status: newStatus,
      changedBy: currentUserId,
      changedByName: getUserName(req.user),
      changedAt: now,
    });

    await task.save();

    const updatedTask = await populateTask(Task.findById(task._id));

    emitSocketEvent(req, "taskUpdated", formatTask(updatedTask));

    return res.status(200).json({
      success: true,
      message: `Task marked as ${newStatus}`,
      task: formatTask(updatedTask),
    });
  } catch (error) {
    console.error("Update task status error:", error);
    return sendError(res, 500, "Failed to update task");
  }
};

exports.startTask = (req, res) => updateTaskStatus(req, res, "in-progress");

exports.completeTask = (req, res) => updateTaskStatus(req, res, "completed");

exports.cancelTask = (req, res) => updateTaskStatus(req, res, "cancelled");

// @desc    Add task note
// @route   POST /api/tasks/:id/notes
// @access  Admin, Manager, Assigned Employee
exports.addTaskNote = async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || !note.trim()) {
      return sendError(res, 400, "Note is required");
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return sendError(res, 404, "Task not found");
    }

    const currentUserId = getCurrentUserId(req);

    if (!isAdminOrManager(req.user) && !userIsAssignedToTask(task, currentUserId)) {
      return sendError(res, 403, "Access denied");
    }

    task.notes.push({
      user: currentUserId,
      name: getUserName(req.user),
      role: req.user.role,
      note: note.trim(),
    });

    await task.save();

    const updatedTask = await populateTask(Task.findById(task._id));

    emitSocketEvent(req, "taskNoteAdded", formatTask(updatedTask));

    return res.status(200).json({
      success: true,
      message: "Note added successfully",
      task: formatTask(updatedTask),
    });
  } catch (error) {
    console.error("Add task note error:", error);
    return sendError(res, 500, "Failed to add note");
  }
};