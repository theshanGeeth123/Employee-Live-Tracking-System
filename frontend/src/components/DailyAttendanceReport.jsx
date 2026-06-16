import { useCallback, useEffect, useState } from "react";
import { Download, Printer, RefreshCcw } from "lucide-react";
import API from "../api/axios";
import { useSocket } from "../context/SocketContext";

const statusClass = {
  online: "bg-emerald-100 text-emerald-700",
  offline: "bg-slate-100 text-slate-700",
  on_break: "bg-amber-100 text-amber-700",
  idle: "bg-blue-100 text-blue-700",
  on_approved_leave: "bg-purple-100 text-purple-700",
  absent: "bg-red-100 text-red-700",
  leave_pending_not_logged: "bg-yellow-100 text-yellow-700",
};

const DailyAttendanceReport = () => {
  const { socket, connected } = useSocket();

  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    try {
      setError("");

      const response = await API.get("/attendance-summary/today");

      setSummary(response.data.summary || {});
      setEmployees(response.data.employees || []);
      setLastUpdated(new Date());
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to load attendance report"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (!socket) return;

    const events = [
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

    events.forEach((eventName) => {
      socket.on(eventName, fetchReport);
    });

    return () => {
      events.forEach((eventName) => {
        socket.off(eventName, fetchReport);
      });
    };
  }, [socket, fetchReport]);

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  const exportCSV = () => {
    const headers = [
      "Employee Name",
      "Email",
      "Role",
      "Department",
      "Position",
      "Status",
      "First Login",
      "Last Seen",
      "Active Time",
      "Break Time",
    ];

    const rows = employees.map((row) => [
      row.employee?.name || "",
      row.employee?.email || "",
      row.employee?.role || "",
      row.employee?.department || "",
      row.employee?.position || "",
      row.statusLabel || row.status || "",
      formatDateTime(row.firstLoginAt),
      formatDateTime(row.lastSeenAt),
      row.totalActiveTime || "",
      row.totalBreakTime || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `daily-attendance-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Daily Attendance Report
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Today live attendance summary and employee activity report
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Socket:{" "}
            <span className={connected ? "text-emerald-600" : "text-red-600"}>
              {connected ? "Connected" : "Disconnected"}
            </span>
            {lastUpdated && <> | Last updated: {lastUpdated.toLocaleTimeString()}</>}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchReport}
            type="button"
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>

          <button
            onClick={exportCSV}
            type="button"
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            onClick={printReport}
            type="button"
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total</p>
          <h3 className="mt-1 text-2xl font-bold">
            {summary?.totalEmployees || 0}
          </h3>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs text-slate-500">Online</p>
          <h3 className="mt-1 text-2xl font-bold text-emerald-700">
            {summary?.online || 0}
          </h3>
        </div>

        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-xs text-slate-500">On Break</p>
          <h3 className="mt-1 text-2xl font-bold text-amber-700">
            {summary?.onBreak || 0}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Offline</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-700">
            {summary?.offline || 0}
          </h3>
        </div>

        <div className="rounded-xl bg-purple-50 p-4">
          <p className="text-xs text-slate-500">Leave</p>
          <h3 className="mt-1 text-2xl font-bold text-purple-700">
            {summary?.approvedLeave || 0}
          </h3>
        </div>

        <div className="rounded-xl bg-red-50 p-4">
          <p className="text-xs text-slate-500">Absent</p>
          <h3 className="mt-1 text-2xl font-bold text-red-700">
            {summary?.absent || 0}
          </h3>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading attendance report...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">First Login</th>
                  <th className="px-4 py-3">Last Seen</th>
                  <th className="px-4 py-3">Active Time</th>
                  <th className="px-4 py-3">Break Time</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((row) => (
                  <tr
                    key={row.employee?.id || row.employee?._id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {row.employee?.name || "-"}
                      </div>

                      <div className="text-xs text-slate-500">
                        {row.employee?.email || "-"}
                      </div>

                      <div className="text-xs text-slate-400">
                        {row.employee?.department || "-"}{" "}
                        {row.employee?.position
                          ? `| ${row.employee.position}`
                          : ""}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusClass[row.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.statusLabel || row.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(row.firstLoginAt)}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(row.lastSeenAt)}
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {row.totalActiveTime || "0h 0m 0s"}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {row.totalBreakTime || "0h 0m 0s"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {employees.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                No attendance records found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyAttendanceReport;