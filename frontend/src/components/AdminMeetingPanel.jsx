import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  createMeeting,
  endMeeting,
  getAdminMeetings,
  startMeeting,
} from "../api/meetingApi";
import MeetingJoinReport from "./MeetingJoinReport";
import { useSocket } from "../context/SocketContext";

const todayInputValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
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

const statusBadgeClass = (status) => {
  if (status === "live") {
    return "bg-green-100 text-green-700";
  }

  if (status === "scheduled") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-gray-100 text-gray-700";
};

const AdminMeetingPanel = () => {
  const socketContext = useSocket();
  const socket = socketContext?.socket || socketContext;

  const [form, setForm] = useState({
    title: "",
    description: "",
    meetingUrl: "",
  });

  const [selectedDate, setSelectedDate] = useState(todayInputValue());
  const [statusFilter, setStatusFilter] = useState("all");

  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState("");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminMeetings({
        date: selectedDate,
        status: statusFilter,
      });

      const loadedMeetings = data.meetings || [];

      setMeetings(loadedMeetings);

      if (loadedMeetings.length > 0) {
        const existingSelected = loadedMeetings.find(
          (meeting) => meeting._id === selectedMeetingId
        );

        if (!existingSelected) {
          const liveMeeting = loadedMeetings.find(
            (meeting) => meeting.status === "live"
          );

          setSelectedMeetingId((liveMeeting || loadedMeetings[0])._id);
        }
      } else {
        setSelectedMeetingId("");
      }
    } catch (err) {
      setError(err.message || "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter, selectedMeetingId]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  useEffect(() => {
    if (!socket?.on) return;

    const refresh = () => {
      loadMeetings();
    };

    socket.on("meetingCreated", refresh);
    socket.on("meetingStarted", refresh);
    socket.on("meetingEnded", refresh);
    socket.on("meetingUserJoined", refresh);

    return () => {
      socket.off?.("meetingCreated", refresh);
      socket.off?.("meetingStarted", refresh);
      socket.off?.("meetingEnded", refresh);
      socket.off?.("meetingUserJoined", refresh);
    };
  }, [socket, loadMeetings]);

  const selectedMeeting = useMemo(() => {
    return meetings.find((meeting) => meeting._id === selectedMeetingId) || null;
  }, [meetings, selectedMeetingId]);

  const liveMeeting = useMemo(() => {
    return meetings.find((meeting) => meeting.status === "live") || null;
  }, [meetings]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleCreateMeeting = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!form.title.trim()) {
      setError("Meeting title is required");
      return;
    }

    if (!form.meetingUrl.trim()) {
      setError("Meeting link is required");
      return;
    }

    try {
      setActionLoading("create");

      const data = await createMeeting({
        title: form.title.trim(),
        description: form.description.trim(),
        meetingUrl: form.meetingUrl.trim(),
      });

      setSuccess(data.message || "Meeting created successfully");

      setForm({
        title: "",
        description: "",
        meetingUrl: "",
      });

      await loadMeetings();

      if (data.meeting?._id) {
        setSelectedMeetingId(data.meeting._id);
      }
    } catch (err) {
      setError(err.message || "Failed to create meeting");
    } finally {
      setActionLoading("");
    }
  };

  const handleStartMeeting = async (meetingId) => {
    resetMessages();

    try {
      setActionLoading(`start-${meetingId}`);

      const data = await startMeeting(meetingId);

      setSuccess(data.message || "Meeting started successfully");

      await loadMeetings();
      setSelectedMeetingId(meetingId);
    } catch (err) {
      setError(err.message || "Failed to start meeting");
    } finally {
      setActionLoading("");
    }
  };

  const handleEndMeeting = async (meetingId) => {
    resetMessages();

    try {
      setActionLoading(`end-${meetingId}`);

      const data = await endMeeting(meetingId);

      setSuccess(data.message || "Meeting ended successfully");

      await loadMeetings();
      setSelectedMeetingId(meetingId);
    } catch (err) {
      setError(err.message || "Failed to end meeting");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Live Meeting Control</h2>
            <p className="text-sm text-gray-500">
              Create, start, end, and track meeting join activity.
            </p>
          </div>

          {liveMeeting && (
            <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
              Live: {liveMeeting.title}
            </div>
          )}
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

        <form onSubmit={handleCreateMeeting} className="grid gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Meeting Title
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleInputChange}
              placeholder="Daily Team Meeting"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Meeting Link
            </label>
            <input
              type="url"
              name="meetingUrl"
              value={form.meetingUrl}
              onChange={handleInputChange}
              placeholder="https://meet.google.com/..."
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={actionLoading === "create"}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "create" ? "Creating..." : "Create Meeting"}
            </button>
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              placeholder="Add meeting details, agenda, or instructions..."
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between xl:flex-col xl:items-stretch">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Meeting History</h3>
              <p className="text-sm text-gray-500">Filter meetings by date and status.</p>
            </div>

            <button
              type="button"
              onClick={loadMeetings}
              disabled={loading}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>

          {meetings.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              No meetings found for this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <button
                  type="button"
                  key={meeting._id}
                  onClick={() => setSelectedMeetingId(meeting._id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedMeetingId === meeting._id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-gray-900">{meeting.title}</h4>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {meeting.description || "No description"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusBadgeClass(
                        meeting.status
                      )}`}
                    >
                      {meeting.status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-gray-500">
                    <div>Created: {formatDateTime(meeting.createdAt)}</div>
                    <div>Started: {formatDateTime(meeting.startedAt)}</div>
                    <div>Ended: {formatDateTime(meeting.endedAt)}</div>
                    <div>Joined Users: {meeting.participantCount || 0}</div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleStartMeeting(meeting._id);
                      }}
                      disabled={
                        meeting.status === "live" ||
                        meeting.status === "ended" ||
                        Boolean(liveMeeting && liveMeeting._id !== meeting._id) ||
                        actionLoading === `start-${meeting._id}`
                      }
                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === `start-${meeting._id}` ? "Starting..." : "Start"}
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEndMeeting(meeting._id);
                      }}
                      disabled={
                        meeting.status !== "live" ||
                        actionLoading === `end-${meeting._id}`
                      }
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading === `end-${meeting._id}` ? "Ending..." : "End"}
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {selectedMeeting && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedMeeting.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedMeeting.description || "No description added."}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusBadgeClass(
                    selectedMeeting.status
                  )}`}
                >
                  {selectedMeeting.status}
                </span>
              </div>

              <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="block text-xs font-bold uppercase text-gray-400">
                    Started At
                  </span>
                  {formatDateTime(selectedMeeting.startedAt)}
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="block text-xs font-bold uppercase text-gray-400">
                    Ended At
                  </span>
                  {formatDateTime(selectedMeeting.endedAt)}
                </div>

                <div className="rounded-xl bg-gray-50 p-3 md:col-span-2">
                  <span className="block text-xs font-bold uppercase text-gray-400">
                    Meeting Link
                  </span>
                  <span className="break-all">{selectedMeeting.meetingUrl}</span>
                </div>
              </div>
            </div>
          )}

          <MeetingJoinReport meeting={selectedMeeting} />
        </div>
      </div>
    </div>
  );
};

export default AdminMeetingPanel;