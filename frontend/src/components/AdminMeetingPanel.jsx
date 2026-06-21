import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Square,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import {
  createMeeting,
  endMeeting,
  getAdminMeetings,
  getMeetingInviteUsers,
  startMeeting,
} from "../api/meetingApi";
import { useSocket } from "../context/SocketContext";

const todayInputValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};

const statusClass = {
  scheduled: "bg-blue-100 text-blue-700",
  live: "bg-emerald-100 text-emerald-700",
  ended: "bg-slate-100 text-slate-700",
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

const getUserId = (user) => {
  return String(user?._id || user?.id || user?.user || "");
};

const AdminMeetingPanel = () => {
  const socketContext = useSocket();
  const socket = socketContext?.socket || socketContext;
  const connected = socketContext?.connected;

  const [form, setForm] = useState({
    title: "",
    description: "",
    meetingUrl: "",
    invitationMode: "selected",
  });

  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteRole, setInviteRole] = useState("all");
  const [inviteUsers, setInviteUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const [meetingDate, setMeetingDate] = useState(todayInputValue());
  const [meetingStatus, setMeetingStatus] = useState("all");
  const [meetings, setMeetings] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedUserIds = useMemo(() => {
    return selectedUsers.map((user) => getUserId(user));
  }, [selectedUsers]);

  const liveMeeting = useMemo(() => {
    return meetings.find((meeting) => meeting.status === "live") || null;
  }, [meetings]);

  const loadInviteUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);

      const data = await getMeetingInviteUsers({
        search: inviteSearch,
        role: inviteRole,
      });

      setInviteUsers(data.users || []);
    } catch (error) {
      setError(error.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }, [inviteSearch, inviteRole]);

  const loadMeetings = useCallback(async () => {
    try {
      setLoadingMeetings(true);
      setError("");

      const data = await getAdminMeetings({
        date: meetingDate,
        status: meetingStatus,
      });

      setMeetings(data.meetings || []);
    } catch (error) {
      setError(error.message || "Failed to load meetings");
    } finally {
      setLoadingMeetings(false);
    }
  }, [meetingDate, meetingStatus]);

  useEffect(() => {
    loadInviteUsers();
  }, [loadInviteUsers]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  useEffect(() => {
    if (!socket?.on) return;

    const refresh = () => {
      loadMeetings();
    };

    const events = [
      "meetingCreated",
      "meetingStarted",
      "meetingEnded",
      "meetingUserJoined",
    ];

    events.forEach((eventName) => {
      socket.on(eventName, refresh);
    });

    return () => {
      events.forEach((eventName) => {
        socket.off?.(eventName, refresh);
      });
    };
  }, [socket, loadMeetings]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const toggleSelectedUser = (user) => {
    const userId = getUserId(user);

    setSelectedUsers((previous) => {
      const exists = previous.some((item) => getUserId(item) === userId);

      if (exists) {
        return previous.filter((item) => getUserId(item) !== userId);
      }

      return [...previous, user];
    });
  };

  const removeSelectedUser = (userId) => {
    setSelectedUsers((previous) =>
      previous.filter((user) => getUserId(user) !== userId)
    );
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      meetingUrl: "",
      invitationMode: "selected",
    });

    setSelectedUsers([]);
  };

  const handleCreateMeeting = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Meeting title is required");
      return;
    }

    if (!form.meetingUrl.trim()) {
      setError("Meeting link is required");
      return;
    }

    if (form.invitationMode === "selected" && selectedUsers.length === 0) {
      setError("Please select at least one meeting receiver");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        meetingUrl: form.meetingUrl.trim(),
        invitationMode: form.invitationMode,
        invitedUsers:
          form.invitationMode === "selected" ? selectedUserIds : [],
      };

      const data = await createMeeting(payload);

      setSuccess(data.message || "Meeting created successfully");
      resetForm();
      await loadMeetings();
    } catch (error) {
      setError(error.message || "Failed to create meeting");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartMeeting = async (meetingId) => {
    setError("");
    setSuccess("");

    try {
      setActionLoadingId(meetingId);

      const data = await startMeeting(meetingId);

      setSuccess(data.message || "Meeting started successfully");
      await loadMeetings();
    } catch (error) {
      setError(error.message || "Failed to start meeting");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleEndMeeting = async (meetingId) => {
    setError("");
    setSuccess("");

    try {
      setActionLoadingId(meetingId);

      const data = await endMeeting(meetingId);

      setSuccess(data.message || "Meeting ended successfully");
      await loadMeetings();
    } catch (error) {
      setError(error.message || "Failed to end meeting");
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Meeting Management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create meetings for everyone or selected employees/managers only.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Socket:{" "}
              <span className={connected ? "text-emerald-600" : "text-red-600"}>
                {connected ? "Connected" : "Disconnected"}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={loadMeetings}
            disabled={loadingMeetings}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw size={16} />
            {loadingMeetings ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {liveMeeting && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-bold uppercase text-emerald-600">
                  Current Live Meeting
                </p>

                <h3 className="mt-1 font-bold text-emerald-900">
                  {liveMeeting.title}
                </h3>

                <p className="mt-1 text-sm text-emerald-700">
                  Started: {formatDateTime(liveMeeting.startedAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleEndMeeting(liveMeeting._id)}
                disabled={actionLoadingId === liveMeeting._id}
                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Square size={15} />
                End Live Meeting
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateMeeting} className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Meeting Title
              </label>

              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleFormChange}
                placeholder="Example: Daily Standup Meeting"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Meeting Link
              </label>

              <div className="relative">
                <LinkIcon
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="url"
                  name="meetingUrl"
                  value={form.meetingUrl}
                  onChange={handleFormChange}
                  placeholder="https://meet.google.com/..."
                  className="w-full rounded-xl border border-slate-300 px-9 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Description
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleFormChange}
              rows={3}
              placeholder="Add meeting purpose or instructions..."
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h3 className="font-bold text-slate-900">Meeting Receivers</h3>

                <p className="mt-1 text-sm text-slate-500">
                  Select who should receive this meeting. Selected mode hides it
                  from everyone else.
                </p>
              </div>

              <select
                name="invitationMode"
                value={form.invitationMode}
                onChange={handleFormChange}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="selected">Selected People Only</option>
                <option value="all">Everyone</option>
              </select>
            </div>

            {form.invitationMode === "selected" && (
              <>
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_200px]">
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                      <Search size={14} /> Search Users
                    </label>

                    <input
                      type="text"
                      value={inviteSearch}
                      onChange={(event) => setInviteSearch(event.target.value)}
                      placeholder="Search by name, email, department, position..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Role
                    </label>

                    <select
                      value={inviteRole}
                      onChange={(event) => setInviteRole(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="all">All</option>
                      <option value="employee">Employees</option>
                      <option value="manager">Managers</option>
                    </select>
                  </div>
                </div>

                {selectedUsers.length > 0 && (
                  <div className="mb-4 rounded-xl bg-white p-3">
                    <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                      Selected Receivers ({selectedUsers.length})
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((user) => {
                        const userId = getUserId(user);

                        return (
                          <span
                            key={userId}
                            className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                          >
                            {user.name || user.fullName || user.email}
                            <button
                              type="button"
                              onClick={() => removeSelectedUser(userId)}
                              className="rounded-full hover:bg-blue-200"
                            >
                              <X size={13} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  {loadingUsers ? (
                    <div className="p-4 text-sm text-slate-500">
                      Loading users...
                    </div>
                  ) : inviteUsers.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">
                      No users found.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {inviteUsers.map((inviteUser) => {
                        const userId = getUserId(inviteUser);
                        const selected = selectedUserIds.includes(userId);

                        return (
                          <button
                            key={userId}
                            type="button"
                            onClick={() => toggleSelectedUser(inviteUser)}
                            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 ${
                              selected ? "bg-blue-50" : ""
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-slate-900">
                                {inviteUser.name ||
                                  inviteUser.fullName ||
                                  inviteUser.email ||
                                  "-"}
                              </div>

                              <div className="text-xs text-slate-500">
                                {inviteUser.email || "-"}
                              </div>

                              <div className="text-xs capitalize text-slate-400">
                                {inviteUser.role}
                                {inviteUser.department
                                  ? ` | ${inviteUser.department}`
                                  : ""}
                                {inviteUser.position
                                  ? ` | ${inviteUser.position}`
                                  : ""}
                              </div>
                            </div>

                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                                selected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-300 bg-white text-transparent"
                              }`}
                            >
                              <CheckCircle2 size={16} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {form.invitationMode === "all" && (
              <div className="rounded-xl bg-white p-4 text-sm text-slate-600">
                This meeting will be visible to all employees and managers.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Plus size={16} />
              {submitting ? "Creating..." : "Create Meeting"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Meeting History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Check meeting status, receivers, and joined participants.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[190px_170px]">
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                <CalendarDays size={14} /> Date
              </label>

              <input
                type="date"
                value={meetingDate}
                onChange={(event) => setMeetingDate(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Status
              </label>

              <select
                value={meetingStatus}
                onChange={(event) => setMeetingStatus(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>
        </div>

        {loadingMeetings ? (
          <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
            Loading meetings...
          </div>
        ) : meetings.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
            No meetings found for selected filters.
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div
                key={meeting._id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">
                        {meeting.title}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          statusClass[meeting.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {meeting.status}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 capitalize">
                        {meeting.invitationMode === "selected"
                          ? "Selected People"
                          : "Everyone"}
                      </span>
                    </div>

                    {meeting.description && (
                      <p className="mb-3 text-sm text-slate-500">
                        {meeting.description}
                      </p>
                    )}

                    <div className="grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                      <p>
                        Created:{" "}
                        <span className="font-semibold text-slate-700">
                          {formatDateTime(meeting.createdAt)}
                        </span>
                      </p>

                      <p>
                        Started:{" "}
                        <span className="font-semibold text-slate-700">
                          {formatDateTime(meeting.startedAt)}
                        </span>
                      </p>

                      <p>
                        Ended:{" "}
                        <span className="font-semibold text-slate-700">
                          {formatDateTime(meeting.endedAt)}
                        </span>
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                        <Users size={13} />
                        Invited: {meeting.invitedCount || 0}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                        <UserCheck size={13} />
                        Joined: {meeting.participantCount || 0}
                      </span>

                      {meeting.status === "live" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                          <Clock size={13} />
                          Live Now
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {meeting.status === "scheduled" && (
                      <button
                        type="button"
                        onClick={() => handleStartMeeting(meeting._id)}
                        disabled={
                          Boolean(liveMeeting) ||
                          actionLoadingId === meeting._id
                        }
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Play size={15} />
                        Start
                      </button>
                    )}

                    {meeting.status === "live" && (
                      <button
                        type="button"
                        onClick={() => handleEndMeeting(meeting._id)}
                        disabled={actionLoadingId === meeting._id}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        <Square size={15} />
                        End
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-bold uppercase text-slate-500">
                      Invited Users
                    </p>

                    {meeting.invitationMode === "all" ? (
                      <p className="text-sm text-slate-500">
                        Everyone can receive this meeting.
                      </p>
                    ) : !meeting.invitedUsers?.length ? (
                      <p className="text-sm text-slate-500">
                        No invited users.
                      </p>
                    ) : (
                      <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                        {meeting.invitedUsers.map((invitee) => (
                          <div
                            key={`${meeting._id}-${invitee.user}`}
                            className="rounded-lg bg-white p-3"
                          >
                            <p className="font-semibold text-slate-900">
                              {invitee.name}
                            </p>

                            <p className="text-xs text-slate-500">
                              {invitee.email}
                            </p>

                            <p className="text-xs capitalize text-slate-400">
                              {invitee.role} | Invited:{" "}
                              {formatDateTime(invitee.invitedAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-bold uppercase text-slate-500">
                      Joined Participants
                    </p>

                    {!meeting.participants?.length ? (
                      <p className="text-sm text-slate-500">
                        No one joined yet.
                      </p>
                    ) : (
                      <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                        {meeting.participants.map((participant) => (
                          <div
                            key={`${meeting._id}-${participant.user}`}
                            className="rounded-lg bg-white p-3"
                          >
                            <p className="font-semibold text-slate-900">
                              {participant.name}
                            </p>

                            <p className="text-xs text-slate-500">
                              {participant.email}
                            </p>

                            <p className="text-xs capitalize text-slate-400">
                              {participant.role} | First joined:{" "}
                              {formatDateTime(participant.joinedAt)}
                            </p>

                            <p className="text-xs text-slate-400">
                              Last joined:{" "}
                              {formatDateTime(participant.lastJoinedAt)} | Count:{" "}
                              {participant.joinCount || 1}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMeetingPanel;