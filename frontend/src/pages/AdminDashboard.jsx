import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";

const statusClass = {
  online: "bg-emerald-100 text-emerald-700",
  offline: "bg-slate-100 text-slate-700",
  on_break: "bg-amber-100 text-amber-700",
  idle: "bg-blue-100 text-blue-700",
  on_approved_leave: "bg-purple-100 text-purple-700",
  absent: "bg-red-100 text-red-700",
  leave_pending_not_logged: "bg-yellow-100 text-yellow-700",
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket();

  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  const fetchAttendanceSummary = useCallback(async () => {
    try {
      setError("");

      const response = await API.get("/attendance-summary/today");

      setSummary(response.data.summary);
      setEmployees(response.data.employees || []);
      setLastUpdated(new Date());
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load attendance summary"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendanceSummary();
  }, [fetchAttendanceSummary]);

  useEffect(() => {
    if (!socket) return;

    const refreshEvents = [
      "presence:user_online",
      "presence:user_offline",
      "presence:user_updated",
      "break:started",
      "break:ended",
      "break:exceeded",
      "leave:requested",
      "leave:updated",
      "leave:cancelled",
      "notification:new",
    ];

    refreshEvents.forEach((eventName) => {
      socket.on(eventName, fetchAttendanceSummary);
    });

    return () => {
      refreshEvents.forEach((eventName) => {
        socket.off(eventName, fetchAttendanceSummary);
      });
    };
  }, [socket, fetchAttendanceSummary]);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Welcome, {user?.name}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Socket:{" "}
              <span
                className={
                  connected ? "text-emerald-600" : "text-red-600"
                }
              >
                {connected ? "Connected" : "Disconnected"}
              </span>
              {lastUpdated && (
                <> | Last updated: {lastUpdated.toLocaleTimeString()}</>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchAttendanceSummary}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Refresh
            </button>

            <button
              onClick={logout}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total</p>
            <h2 className="mt-2 text-3xl font-bold">
              {summary?.totalEmployees || 0}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Online</p>
            <h2 className="mt-2 text-3xl font-bold text-emerald-600">
              {summary?.online || 0}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">On Break</p>
            <h2 className="mt-2 text-3xl font-bold text-amber-600">
              {summary?.onBreak || 0}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Offline</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-600">
              {summary?.offline || 0}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Leave</p>
            <h2 className="mt-2 text-3xl font-bold text-purple-600">
              {summary?.approvedLeave || 0}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Absent</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {summary?.absent || 0}
            </h2>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Live Employee Status
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">First Login</th>
                    <th className="px-6 py-4">Active Time</th>
                    <th className="px-6 py-4">Break Time</th>
                    <th className="px-6 py-4">Last Seen</th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map((row) => (
                    <tr
                      key={row.employee.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {row.employee.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.employee.email}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            statusClass[row.status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {row.statusLabel}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {row.firstLoginAt
                          ? new Date(row.firstLoginAt).toLocaleTimeString()
                          : "-"}
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-700">
                        {row.totalActiveTime}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {row.totalBreakTime}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {row.lastSeenAt
                          ? new Date(row.lastSeenAt).toLocaleTimeString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {employees.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-500">
                  No employees found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;