import React, { useCallback, useEffect, useState } from "react";
import { getActiveMeeting, joinMeeting } from "../api/meetingApi";
import { useSocket } from "../context/SocketContext";

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

const UserMeetingPanel = () => {
  const socketContext = useSocket();
  const socket = socketContext?.socket || socketContext;

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadActiveMeeting = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getActiveMeeting();

      setMeeting(data.meeting || null);
    } catch (err) {
      setError(err.message || "Failed to load meeting");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveMeeting();
  }, [loadActiveMeeting]);

  useEffect(() => {
    if (!socket?.on) return;

    const refresh = () => {
      loadActiveMeeting();
    };

    socket.on("meetingCreated", refresh);
    socket.on("meetingStarted", refresh);
    socket.on("meetingEnded", refresh);

    return () => {
      socket.off?.("meetingCreated", refresh);
      socket.off?.("meetingStarted", refresh);
      socket.off?.("meetingEnded", refresh);
    };
  }, [socket, loadActiveMeeting]);

  const handleJoinMeeting = async () => {
    if (!meeting?._id || meeting.status !== "live") return;

    setError("");
    setMessage("");

    const meetingWindow = window.open("about:blank", "_blank");

    try {
      setJoining(true);

      const data = await joinMeeting(meeting._id);

      if (!data.meetingUrl) {
        if (meetingWindow) meetingWindow.close();
        throw new Error("Meeting link not available");
      }

      if (meetingWindow) {
        meetingWindow.location.href = data.meetingUrl;
      } else {
        window.open(data.meetingUrl, "_blank", "noopener,noreferrer");
      }

      setMeeting((previous) =>
        previous
          ? {
              ...previous,
              currentUserJoined: true,
              participantCount: (previous.participantCount || 0) + 1,
            }
          : previous
      );

      setMessage("Join recorded successfully.");
    } catch (err) {
      if (meetingWindow) meetingWindow.close();
      setError(err.message || "Failed to join meeting");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Live Meeting</h2>
          <p className="text-sm text-gray-500">
            Join active admin meetings from here.
          </p>
        </div>

        <button
          type="button"
          onClick={loadActiveMeeting}
          disabled={loading}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {!meeting ? (
        <div className="rounded-2xl bg-gray-50 p-5 text-center">
          <p className="font-semibold text-gray-700">No meeting available now</p>
          <p className="mt-1 text-sm text-gray-500">
            When admin starts a meeting, the Join Now button will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{meeting.title}</h3>
              <p className="mt-1 text-sm text-gray-600">
                {meeting.description || "No description added."}
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

          <div className="mb-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-3">
              <span className="block text-xs font-bold uppercase text-gray-400">
                Started At
              </span>
              {formatDateTime(meeting.startedAt)}
            </div>

            <div className="rounded-xl bg-white p-3">
              <span className="block text-xs font-bold uppercase text-gray-400">
                Participants
              </span>
              {meeting.participantCount || 0}
            </div>
          </div>

          {meeting.status === "live" ? (
            <button
              type="button"
              onClick={handleJoinMeeting}
              disabled={joining}
              className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {joining
                ? "Opening Meeting..."
                : meeting.currentUserJoined
                ? "Open Meeting Again"
                : "Join Now"}
            </button>
          ) : (
            <div className="rounded-xl bg-white p-4 text-sm text-gray-600">
              Meeting is not live yet. Join Now button will appear after admin starts it.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserMeetingPanel;