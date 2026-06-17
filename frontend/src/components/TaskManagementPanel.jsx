import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addTaskNote,
  cancelTask,
  completeTask,
  createTask,
  deleteTask,
  getAdminTasks,
  getAssignableUsers,
  startTask,
  updateTask,
} from "../api/taskApi";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const getUserLabel = (user) => {
  if (!user) return "Unknown";

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    user.name ||
    user.fullName ||
    user.username ||
    fullName ||
    user.email ||
    "Unknown"
  );
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDateInputValue = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 10);
};

const statusClass = (status) => {
  if (status === "completed") return "bg-green-100 text-green-700";
  if (status === "in-progress") return "bg-blue-100 text-blue-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

const priorityClass = (priority) => {
  if (priority === "high") return "bg-red-100 text-red-700";
  if (priority === "medium") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
};

const TaskManagementPanel = () => {
  const { user } = useAuth();
  const socketContext = useSocket();
  const socket = socketContext?.socket || socketContext;

  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [selectedTaskId, setSelectedTaskId] = useState("");

  const [filters, setFilters] = useState({
    status: "all",
    assignedTo: "all",
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    assignedTo: "",
  });

  const [editMode, setEditMode] = useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    assignedTo: "",
  });

  const [noteText, setNoteText] = useState("");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedTask = useMemo(() => {
    return tasks.find((task) => task._id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    if (!selectedTask) {
      setEditMode(false);
      setEditForm({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
        assignedTo: "",
      });
      return;
    }

    setEditForm({
      title: selectedTask.title || "",
      description: selectedTask.description || "",
      priority: selectedTask.priority || "medium",
      dueDate: toDateInputValue(selectedTask.dueDate),
      assignedTo: selectedTask.assignedTo?._id || selectedTask.assignedTo || "",
    });
  }, [selectedTask]);

  const loadUsers = useCallback(async () => {
    const data = await getAssignableUsers();
    setUsers(data.users || []);
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminTasks(filters);
      const loadedTasks = data.tasks || [];

      setTasks(loadedTasks);

      if (loadedTasks.length > 0) {
        const stillSelected = loadedTasks.find(
          (task) => task._id === selectedTaskId
        );

        if (!stillSelected) {
          setSelectedTaskId(loadedTasks[0]._id);
        }
      } else {
        setSelectedTaskId("");
      }
    } catch (err) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [filters, selectedTaskId]);

  useEffect(() => {
    loadUsers().catch((err) => {
      setError(err.message || "Failed to load users");
    });
  }, [loadUsers]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!socket?.on) return;

    const refresh = () => {
      loadTasks();
    };

    socket.on("taskCreated", refresh);
    socket.on("taskUpdated", refresh);
    socket.on("taskNoteAdded", refresh);
    socket.on("taskDeleted", refresh);

    return () => {
      socket.off?.("taskCreated", refresh);
      socket.off?.("taskUpdated", refresh);
      socket.off?.("taskNoteAdded", refresh);
      socket.off?.("taskDeleted", refresh);
    };
  }, [socket, loadTasks]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    clearMessages();

    if (!form.title.trim()) {
      setError("Task title is required");
      return;
    }

    if (!form.assignedTo) {
      setError("Please select an employee");
      return;
    }

    try {
      setActionLoading("create");

      const data = await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate || null,
        assignedTo: form.assignedTo,
      });

      setSuccess(data.message || "Task created successfully");

      setForm({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
        assignedTo: "",
      });

      await loadTasks();

      if (data.task?._id) {
        setSelectedTaskId(data.task._id);
      }
    } catch (err) {
      setError(err.message || "Failed to create task");
    } finally {
      setActionLoading("");
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask?._id) return;

    clearMessages();

    if (!editForm.title.trim()) {
      setError("Task title is required");
      return;
    }

    if (!editForm.assignedTo) {
      setError("Please select an employee");
      return;
    }

    try {
      setActionLoading("update");

      const data = await updateTask(selectedTask._id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        priority: editForm.priority,
        dueDate: editForm.dueDate || null,
        assignedTo: editForm.assignedTo,
      });

      setSuccess(data.message || "Task updated successfully");
      setEditMode(false);

      await loadTasks();
      setSelectedTaskId(selectedTask._id);
    } catch (err) {
      setError(err.message || "Failed to update task");
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask?._id) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this task? This action cannot be undone."
    );

    if (!confirmed) return;

    clearMessages();

    try {
      setActionLoading("delete");

      const data = await deleteTask(selectedTask._id);

      setSuccess(data.message || "Task removed successfully");
      setEditMode(false);
      setSelectedTaskId("");

      await loadTasks();
    } catch (err) {
      setError(err.message || "Failed to remove task");
    } finally {
      setActionLoading("");
    }
  };

  const handleStartTask = async (taskId) => {
    clearMessages();

    try {
      setActionLoading(`start-${taskId}`);

      const data = await startTask(taskId);

      setSuccess(data.message || "Task started");
      await loadTasks();
      setSelectedTaskId(taskId);
    } catch (err) {
      setError(err.message || "Failed to start task");
    } finally {
      setActionLoading("");
    }
  };

  const handleCompleteTask = async (taskId) => {
    clearMessages();

    try {
      setActionLoading(`complete-${taskId}`);

      const data = await completeTask(taskId, "");

      setSuccess(data.message || "Task completed");
      await loadTasks();
      setSelectedTaskId(taskId);
    } catch (err) {
      setError(err.message || "Failed to complete task");
    } finally {
      setActionLoading("");
    }
  };

  const handleCancelTask = async (taskId) => {
    clearMessages();

    try {
      setActionLoading(`cancel-${taskId}`);

      const data = await cancelTask(taskId);

      setSuccess(data.message || "Task cancelled");
      await loadTasks();
      setSelectedTaskId(taskId);
    } catch (err) {
      setError(err.message || "Failed to cancel task");
    } finally {
      setActionLoading("");
    }
  };

  const handleAddNote = async () => {
    if (!selectedTask?._id) return;

    clearMessages();

    if (!noteText.trim()) {
      setError("Note is required");
      return;
    }

    try {
      setActionLoading("note");

      const data = await addTaskNote(selectedTask._id, noteText.trim());

      setSuccess(data.message || "Note added");
      setNoteText("");

      await loadTasks();
      setSelectedTaskId(selectedTask._id);
    } catch (err) {
      setError(err.message || "Failed to add note");
    } finally {
      setActionLoading("");
    }
  };

  const canEditSelectedTask =
    selectedTask && !["completed", "cancelled"].includes(selectedTask.status);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">Task Assignment</h2>
          <p className="text-sm text-gray-500">
            Assign tasks to employees and track their daily work progress.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleCreateTask} className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Task Title
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleFormChange}
              placeholder="Example: Prepare daily sales report"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Assign To
            </label>
            <select
              name="assignedTo"
              value={form.assignedTo}
              onChange={handleFormChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select employee</option>
              {users.map((item) => (
                <option key={item._id} value={item._id}>
                  {getUserLabel(item)} - {item.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Priority
            </label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleFormChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleFormChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleFormChange}
              rows={3}
              placeholder="Add task instructions..."
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={actionLoading === "create"}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {actionLoading === "create" ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Task List</h3>
              <p className="text-sm text-gray-500">Manage assigned tasks.</p>
            </div>

            <button
              type="button"
              onClick={loadTasks}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  status: event.target.value,
                }))
              }
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filters.assignedTo}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  assignedTo: event.target.value,
                }))
              }
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All Employees</option>
              {users.map((item) => (
                <option key={item._id} value={item._id}>
                  {getUserLabel(item)}
                </option>
              ))}
            </select>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              No tasks found.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <button
                  type="button"
                  key={task._id}
                  onClick={() => setSelectedTaskId(task._id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedTaskId === task._id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h4 className="font-bold text-gray-900">{task.title}</h4>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-xs text-gray-500">
                    {task.description || "No description"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${priorityClass(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                      Due: {formatDate(task.dueDate)}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Assigned to: {getUserLabel(task.assignedTo)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {!selectedTask ? (
            <div className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">
              Select a task to view details.
            </div>
          ) : (
            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedTask.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedTask.description || "No description added."}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClass(
                    selectedTask.status
                  )}`}
                >
                  {selectedTask.status}
                </span>
              </div>

              <div className="mb-5 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="block text-xs font-bold uppercase text-gray-400">
                    Assigned To
                  </span>
                  {getUserLabel(selectedTask.assignedTo)}
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="block text-xs font-bold uppercase text-gray-400">
                    Assigned By
                  </span>
                  {getUserLabel(selectedTask.assignedBy)}
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="block text-xs font-bold uppercase text-gray-400">
                    Due Date
                  </span>
                  {formatDate(selectedTask.dueDate)}
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="block text-xs font-bold uppercase text-gray-400">
                    Priority
                  </span>
                  {selectedTask.priority}
                </div>
              </div>

              {isAdmin && (
                <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900">
                        Admin Task Control
                      </h4>
                      <p className="text-sm text-gray-500">
                        Edit active tasks or remove any selected task.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditMode((previous) => !previous)}
                        disabled={!canEditSelectedTask}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {editMode ? "Close Edit" : "Edit Task"}
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteTask}
                        disabled={actionLoading === "delete"}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {actionLoading === "delete" ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>

                  {!canEditSelectedTask && (
                    <div className="rounded-xl bg-white p-3 text-sm text-gray-600">
                      Completed or cancelled tasks cannot be edited, but admin can
                      still remove them.
                    </div>
                  )}

                  {editMode && canEditSelectedTask && (
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                          Task Title
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={editForm.title}
                          onChange={handleEditFormChange}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                          Assign To
                        </label>
                        <select
                          name="assignedTo"
                          value={editForm.assignedTo}
                          onChange={handleEditFormChange}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="">Select employee</option>
                          {users.map((item) => (
                            <option key={item._id} value={item._id}>
                              {getUserLabel(item)} - {item.role}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                          Priority
                        </label>
                        <select
                          name="priority"
                          value={editForm.priority}
                          onChange={handleEditFormChange}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                          Due Date
                        </label>
                        <input
                          type="date"
                          name="dueDate"
                          value={editForm.dueDate}
                          onChange={handleEditFormChange}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={editForm.description}
                          onChange={handleEditFormChange}
                          rows={3}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex gap-2 lg:col-span-2">
                        <button
                          type="button"
                          onClick={handleUpdateTask}
                          disabled={actionLoading === "update"}
                          className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          {actionLoading === "update"
                            ? "Saving..."
                            : "Save Changes"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditMode(false)}
                          className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleStartTask(selectedTask._id)}
                  disabled={
                    selectedTask.status !== "pending" ||
                    actionLoading === `start-${selectedTask._id}`
                  }
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Start
                </button>

                <button
                  type="button"
                  onClick={() => handleCompleteTask(selectedTask._id)}
                  disabled={
                    !["pending", "in-progress"].includes(selectedTask.status) ||
                    actionLoading === `complete-${selectedTask._id}`
                  }
                  className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Complete
                </button>

                <button
                  type="button"
                  onClick={() => handleCancelTask(selectedTask._id)}
                  disabled={
                    ["completed", "cancelled"].includes(selectedTask.status) ||
                    actionLoading === `cancel-${selectedTask._id}`
                  }
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              <div className="mb-5">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Add Work Note
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="Add update or instruction..."
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={actionLoading === "note"}
                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-bold text-gray-900">Work Notes</h4>

                {selectedTask.notes?.length === 0 ? (
                  <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                    No notes yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...(selectedTask.notes || [])].reverse().map((note) => (
                      <div
                        key={note._id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="mb-1 flex justify-between gap-2 text-xs text-gray-500">
                          <span>
                            {note.name} - {note.role}
                          </span>
                          <span>{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700">{note.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskManagementPanel;