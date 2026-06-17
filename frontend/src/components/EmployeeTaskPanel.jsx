import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addTaskNote,
  completeTask,
  getMyTasks,
  startTask,
} from "../api/taskApi";
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

const getAssignedLabels = (assignedTo) => {
  const list = Array.isArray(assignedTo)
    ? assignedTo
    : assignedTo
    ? [assignedTo]
    : [];

  if (!list.length) return "Not assigned";

  return list.map(getUserLabel).join(", ");
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

const EmployeeTaskPanel = () => {
  const socketContext = useSocket();
  const socket = socketContext?.socket || socketContext;

  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [noteText, setNoteText] = useState("");
  const [completionRemark, setCompletionRemark] = useState("");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedTask = useMemo(() => {
    return tasks.find((task) => task._id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getMyTasks({
        status: statusFilter,
      });

      const loadedTasks = data.tasks || [];

      setTasks(loadedTasks);

      setSelectedTaskId((previousSelectedId) => {
        if (!loadedTasks.length) return "";

        const stillSelected = loadedTasks.some(
          (task) => task._id === previousSelectedId
        );

        return stillSelected ? previousSelectedId : loadedTasks[0]._id;
      });
    } catch (err) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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

  const handleStartTask = async () => {
    if (!selectedTask?._id) return;

    clearMessages();

    try {
      setActionLoading("start");

      const data = await startTask(selectedTask._id);

      setSuccess(data.message || "Task started");
      await loadTasks();
      setSelectedTaskId(selectedTask._id);
    } catch (err) {
      setError(err.message || "Failed to start task");
    } finally {
      setActionLoading("");
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask?._id) return;

    clearMessages();

    try {
      setActionLoading("complete");

      const data = await completeTask(selectedTask._id, completionRemark.trim());

      setSuccess(data.message || "Task completed");
      setCompletionRemark("");

      await loadTasks();
      setSelectedTaskId(selectedTask._id);
    } catch (err) {
      setError(err.message || "Failed to complete task");
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Tasks</h2>
            <p className="text-sm text-gray-500">
              View assigned tasks, add work notes, and update progress.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTasks}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
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

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-64"
        >
          <option value="all">All Tasks</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-gray-900">
            Assigned Tasks
          </h3>

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

                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                      {task.assignedToCount || 1} assigned
                    </span>
                  </div>
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

                <div className="rounded-xl bg-gray-50 p-3 md:col-span-2">
                  <span className="block text-xs font-bold uppercase text-gray-400">
                    Assigned Team
                  </span>
                  {getAssignedLabels(selectedTask.assignedTo)}
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="block text-xs font-bold uppercase text-gray-400">
                    Started At
                  </span>
                  {formatDateTime(selectedTask.startedAt)}
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="block text-xs font-bold uppercase text-gray-400">
                    Completed At
                  </span>
                  {formatDateTime(selectedTask.completedAt)}
                </div>
              </div>

              <div className="mb-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleStartTask}
                  disabled={
                    selectedTask.status !== "pending" ||
                    actionLoading === "start"
                  }
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === "start" ? "Starting..." : "Start Task"}
                </button>
              </div>

              {["pending", "in-progress"].includes(selectedTask.status) && (
                <div className="mb-5">
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Completion Remark
                  </label>

                  <textarea
                    value={completionRemark}
                    onChange={(event) => setCompletionRemark(event.target.value)}
                    rows={3}
                    placeholder="Add final remark before completing..."
                    className="mb-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={handleCompleteTask}
                    disabled={actionLoading === "complete"}
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === "complete"
                      ? "Completing..."
                      : "Complete Task"}
                  </button>
                </div>
              )}

              <div className="mb-5">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Add Work Note
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="What did you work on?"
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

export default EmployeeTaskPanel;