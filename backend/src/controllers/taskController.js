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

const populateTask = (query) => {
  return query
    .populate("assignedTo", "name fullName firstName lastName username email role")
    .populate("assignedBy", "name fullName firstName lastName username email role");
};

const formatTask = (task) => {
  if (!task) return null;

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
    assignedTo: task.assignedTo,
    assignedBy: task.assignedBy,
    notes: task.notes || [],
    statusHistory: task.statusHistory || [],
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
};

exports.getAssignableUsers = async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return sendError(res, 403, "Access denied");
    }

    const users = await User.find({
      role: { $in: ["employee", "manager"] },
    })
      .select("name fullName firstName lastName username email role status isActive")
      .sort({ name: 1, email: 1 });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get assignable users error:", error);
    return sendError(res, 500, "Failed to load users");
  }
};

exports.createTask = async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return sendError(res, 403, "Only admin or manager can create tasks");
    }

    const currentUserId = getCurrentUserId(req);
    const { title, description, priority, dueDate, assignedTo } = req.body;

    if (!title || !title.trim()) {
      return sendError(res, 400, "Task title is required");
    }

    if (!assignedTo) {
      return sendError(res, 400, "Assigned employee is required");
    }

    const assignedUser = await User.findById(assignedTo);

    if (!assignedUser) {
      return sendError(res, 404, "Assigned user not found");
    }

    if (!["employee", "manager"].includes(assignedUser.role)) {
      return sendError(res, 400, "Task can be assigned only to employee or manager");
    }

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || "",
      priority: priority || "medium",
      dueDate: dueDate || null,
      assignedTo,
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

    const tasks = await populateTask(
      Task.find(filter).sort({ createdAt: -1 })
    );

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

    const tasks = await populateTask(
      Task.find(filter).sort({ createdAt: -1 })
    );

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

exports.getTaskById = async (req, res) => {
  try {
    const task = await populateTask(Task.findById(req.params.id));

    if (!task) {
      return sendError(res, 404, "Task not found");
    }

    const currentUserId = String(getCurrentUserId(req));
    const assignedToId = String(task.assignedTo?._id || task.assignedTo);

    if (!isAdminOrManager(req.user) && currentUserId !== assignedToId) {
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

const updateTaskStatus = async (req, res, newStatus) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return sendError(res, 404, "Task not found");
    }

    const currentUserId = String(getCurrentUserId(req));
    const assignedToId = String(task.assignedTo);

    if (!isAdminOrManager(req.user) && currentUserId !== assignedToId) {
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
      changedBy: getCurrentUserId(req),
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

    const currentUserId = String(getCurrentUserId(req));
    const assignedToId = String(task.assignedTo);

    if (!isAdminOrManager(req.user) && currentUserId !== assignedToId) {
      return sendError(res, 403, "Access denied");
    }

    task.notes.push({
      user: getCurrentUserId(req),
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
      return sendError(
        res,
        400,
        "Completed or cancelled tasks cannot be edited"
      );
    }

    const { title, description, priority, dueDate, assignedTo } = req.body;

    if (!title || !title.trim()) {
      return sendError(res, 400, "Task title is required");
    }

    if (!assignedTo) {
      return sendError(res, 400, "Assigned employee is required");
    }

    const assignedUser = await User.findById(assignedTo);

    if (!assignedUser) {
      return sendError(res, 404, "Assigned user not found");
    }

    if (!["employee", "manager"].includes(assignedUser.role)) {
      return sendError(
        res,
        400,
        "Task can be assigned only to employee or manager"
      );
    }

    task.title = title.trim();
    task.description = description?.trim() || "";
    task.priority = priority || "medium";
    task.dueDate = dueDate || null;
    task.assignedTo = assignedTo;

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