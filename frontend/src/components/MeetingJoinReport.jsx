import React from "react";

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

const MeetingJoinReport = ({ meeting }) => {
  const participants = [...(meeting?.participants || [])].sort((a, b) => {
    return new Date(a.joinedAt || 0) - new Date(b.joinedAt || 0);
  });

  if (!meeting) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">Select a meeting to view joined users.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Joined Users</h3>
          <p className="text-sm text-gray-500">
            {participants.length} user{participants.length === 1 ? "" : "s"} joined this meeting
          </p>
        </div>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
          {meeting.status}
        </span>
      </div>

      {participants.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
          No users have joined yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">First Joined</th>
                <th className="px-4 py-3">Last Joined</th>
                <th className="px-4 py-3">Clicks</th>
              </tr>
            </thead>

            <tbody>
              {participants.map((participant) => (
                <tr
                  key={participant.user}
                  className="border-b text-gray-700 last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {participant.name}
                  </td>
                  <td className="px-4 py-3">{participant.email || "-"}</td>
                  <td className="px-4 py-3 capitalize">{participant.role}</td>
                  <td className="px-4 py-3">{formatDateTime(participant.joinedAt)}</td>
                  <td className="px-4 py-3">{formatDateTime(participant.lastJoinedAt)}</td>
                  <td className="px-4 py-3">{participant.joinCount || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MeetingJoinReport;