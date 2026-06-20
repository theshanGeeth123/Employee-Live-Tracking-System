import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAdvancedAttendanceReport,
  getAttendanceSettings,
  updateAttendanceSettings,
} from "../api/attendanceAdvancedApi";
import { useAuth } from "../context/AuthContext";
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
  if (status === "Online") return "bg-green-100 text-green-700";
  if (status === "Present") return "bg-blue-100 text-blue-700";
  if (status === "Absent") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

const buildCsv = (report) => {
  const headers = [
    "Employee",
    "Email",
    "Role",
    "Status",
    "Expected Days",
    "Present Days",
    "Absent Days",
    "Late Days",
    "Early Checkout Days",
    "First Login",
    "Last Seen",
    "Expected Time",
    "Work Time",
    "Online Time",
    "Break Time",
    "Overtime",
    "Shortage",
  ];

  const rows = (report?.rows || []).map((row) => [
    row.user?.name || "",
    row.user?.email || "",
    row.user?.role || "",
    row.status || "",
    row.expectedDays || 0,
    row.presentDays || 0,
    row.absentDays || 0,
    row.lateDays || 0,
    row.earlyCheckoutDays || 0,
    formatDateTime(row.firstLogin),
    formatDateTime(row.lastSeen),
    row.expectedTime || "",
    row.scheduledWorkTime || "",
    row.onlineTime || "",
    row.breakTime || "",
    row.overtime || "",
    row.shortage || "",
  ]);

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
};

const DailyAttendanceReport = () => {
  const { user } = useAuth();
  const socketContext = useSocket();
  const connected = socketContext?.connected;
  const socket = socketContext?.socket || socketContext;

  const isAdmin = user?.role === "admin";

  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(todayInputValue());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [settings, setSettings] = useState({
    workStartTime: "08:30",
    workEndTime: "17:30",
    graceMinutes: 15,
  });

  const [settingsForm, setSettingsForm] = useState({
    workStartTime: "08:30",
    workEndTime: "17:30",
    graceMinutes: 15,
  });

  const [report, setReport] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedRow = useMemo(() => {
    return (
      report?.rows?.find((row) => row.user?._id === selectedEmployeeId) || null
    );
  }, [report, selectedEmployeeId]);

  const loadSettings = useCallback(async () => {
    const data = await getAttendanceSettings();

    const loadedSettings = data.settings || {
      workStartTime: "08:30",
      workEndTime: "17:30",
      graceMinutes: 15,
    };

    setSettings(loadedSettings);
    setSettingsForm({
      workStartTime: loadedSettings.workStartTime || "08:30",
      workEndTime: loadedSettings.workEndTime || "17:30",
      graceMinutes: loadedSettings.graceMinutes ?? 15,
    });
  }, []);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdvancedAttendanceReport({
        type: reportType,
        date: selectedDate,
        search,
        role: roleFilter,
      });

      const loadedReport = data.report || null;

      setReport(loadedReport);

      if (loadedReport?.rows?.length) {
        setSelectedEmployeeId((previous) => {
          const stillExists = loadedReport.rows.some(
            (row) => row.user?._id === previous
          );

          return stillExists ? previous : loadedReport.rows[0].user?._id || "";
        });
      } else {
        setSelectedEmployeeId("");
      }
    } catch (err) {
      setError(err.message || "Failed to load attendance report");
    } finally {
      setLoading(false);
    }
  }, [reportType, selectedDate, search, roleFilter]);

  useEffect(() => {
    loadSettings().catch((err) => {
      setError(err.message || "Failed to load attendance settings");
    });
  }, [loadSettings]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (!socket?.on) return;

    const refresh = () => {
      loadReport();
    };

    socket.on("presenceUpdated", refresh);
    socket.on("employeeStatusUpdated", refresh);
    socket.on("breakStarted", refresh);
    socket.on("breakEnded", refresh);

    return () => {
      socket.off?.("presenceUpdated", refresh);
      socket.off?.("employeeStatusUpdated", refresh);
      socket.off?.("breakStarted", refresh);
      socket.off?.("breakEnded", refresh);
    };
  }, [socket, loadReport]);

  const handleSettingsChange = (event) => {
    const { name, value } = event.target;

    setSettingsForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSaveSettings = async () => {
    setError("");
    setSuccess("");

    try {
      setSettingsLoading(true);

      const data = await updateAttendanceSettings({
        workStartTime: settingsForm.workStartTime,
        workEndTime: settingsForm.workEndTime,
        graceMinutes: Number(settingsForm.graceMinutes || 0),
      });

      setSuccess(data.message || "Working time updated successfully");
      setSettings(data.settings);
      await loadReport();
    } catch (err) {
      setError(err.message || "Failed to save working time");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!report) return;

    const csv = buildCsv(report);
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `attendance-${report.type}-${report.startDate}-to-${report.endDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = report?.summary || {};

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Attendance Report
            </h2>
            <p className="text-sm text-gray-500">
              Generate daily, weekly, and monthly attendance reports with
              working-time calculations.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Socket:{" "}
              <span className={connected ? "text-green-600" : "text-red-600"}>
                {connected ? "Connected" : "Disconnected"}
              </span>
              {report && (
                <>
                  {" "}
                  | Range: {report.startDate} to {report.endDate}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!report}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
            >
              Export CSV
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
            >
              Print
            </button>
          </div>
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

        <div className="mb-6 grid gap-4 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="daily">Daily Report</option>
              <option value="weekly">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
              Search User
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or email..."
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="employee">Employees</option>
              <option value="manager">Managers</option>
            </select>
          </div>

          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs font-bold uppercase text-blue-500">
              Current Working Time
            </p>
            <p className="text-sm font-bold text-blue-900">
              {settings.workStartTime} - {settings.workEndTime}
            </p>
            <p className="text-xs text-blue-700">
              Grace: {settings.graceMinutes} min
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="mb-3">
              <h3 className="font-bold text-gray-900">
                Admin Working Time Setting
              </h3>
              <p className="text-sm text-gray-500">
                Set official working hours used for expected time, overtime, and
                shortage calculation.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                  Start Time
                </label>
                <input
                  type="time"
                  name="workStartTime"
                  value={settingsForm.workStartTime}
                  onChange={handleSettingsChange}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                  End Time
                </label>
                <input
                  type="time"
                  name="workEndTime"
                  value={settingsForm.workEndTime}
                  onChange={handleSettingsChange}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                  Grace Minutes
                </label>
                <input
                  type="number"
                  min="0"
                  name="graceMinutes"
                  value={settingsForm.graceMinutes}
                  onChange={handleSettingsChange}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={settingsLoading}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {settingsLoading ? "Saving..." : "Save Working Time"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {summary.totalUsers || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-green-50 p-4">
            <p className="text-sm text-green-600">Present</p>
            <p className="mt-2 text-2xl font-black text-green-700">
              {summary.presentUsers || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-red-50 p-4">
            <p className="text-sm text-red-600">Absent</p>
            <p className="mt-2 text-2xl font-black text-red-700">
              {summary.absentUsers || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-yellow-50 p-4">
            <p className="text-sm text-yellow-700">Late Users</p>
            <p className="mt-2 text-2xl font-black text-yellow-700">
              {summary.lateUsers || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-sm text-blue-600">Total Work</p>
            <p className="mt-2 text-lg font-black text-blue-700">
              {summary.totalWorkTime || "0h 0m 0s"}
            </p>
          </div>

          <div className="rounded-2xl bg-purple-50 p-4">
            <p className="text-sm text-purple-600">Overtime</p>
            <p className="mt-2 text-lg font-black text-purple-700">
              {summary.totalOvertime || "0h 0m 0s"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">First Login</th>
                  <th className="px-4 py-3">Last Seen</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Work Time</th>
                  <th className="px-4 py-3">Break</th>
                  <th className="px-4 py-3">Overtime</th>
                  <th className="px-4 py-3">Shortage</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Loading attendance report...
                    </td>
                  </tr>
                ) : !report?.rows?.length ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row) => (
                    <tr
                      key={row.user?._id}
                      onClick={() => setSelectedEmployeeId(row.user?._id)}
                      className={`cursor-pointer border-b last:border-b-0 hover:bg-gray-50 ${
                        selectedEmployeeId === row.user?._id ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900">
                          {row.user?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {row.user?.email}
                        </p>
                        <p className="text-xs capitalize text-gray-400">
                          {row.user?.role}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {formatDateTime(row.firstLogin)}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {formatDateTime(row.lastSeen)}
                      </td>

                      <td className="px-4 py-3 font-semibold text-gray-700">
                        {row.expectedTime}
                      </td>

                      <td className="px-4 py-3 font-semibold text-blue-700">
                        {row.scheduledWorkTime}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {row.breakTime}
                      </td>

                      <td className="px-4 py-3 font-semibold text-purple-700">
                        {row.overtime}
                      </td>

                      <td className="px-4 py-3 font-semibold text-red-600">
                        {row.shortage}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {!selectedRow ? (
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              Select an employee to view full daily details.
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedRow.user?.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedRow.user?.email}
                </p>
                <p className="text-xs capitalize text-gray-400">
                  {selectedRow.user?.role}
                </p>
              </div>

              <div className="mb-5 grid gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-bold uppercase text-gray-400">
                    Present / Absent Days
                  </p>
                  <p className="font-bold text-gray-800">
                    {selectedRow.presentDays} present / {selectedRow.absentDays} absent
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-bold uppercase text-gray-400">
                    Late / Early Checkout
                  </p>
                  <p className="font-bold text-gray-800">
                    {selectedRow.lateDays} late / {selectedRow.earlyCheckoutDays} early
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-bold uppercase text-gray-400">
                    Total Online Time
                  </p>
                  <p className="font-bold text-gray-800">
                    {selectedRow.onlineTime}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-bold uppercase text-gray-400">
                    Active Time
                  </p>
                  <p className="font-bold text-gray-800">
                    {selectedRow.activeTime}
                  </p>
                </div>
              </div>

              <h4 className="mb-3 font-bold text-gray-900">Session Details</h4>

              {!selectedRow.sessions?.length ? (
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
                  No session found for this report range.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedRow.sessions.map((session) => (
                    <div
                      key={session._id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-bold text-gray-900">
                          {session.date}
                        </p>

                        <div className="flex gap-2">
                          {session.isLate && (
                            <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">
                              Late
                            </span>
                          )}

                          {session.isEarly && (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                              Early
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2 text-xs text-gray-600">
                        <p>First Login: {formatDateTime(session.firstLogin)}</p>
                        <p>Last Seen: {formatDateTime(session.lastSeen)}</p>
                        <p>Online: {session.onlineTime}</p>
                        <p>Active: {session.activeTime}</p>
                        <p>Break: {session.breakTime}</p>
                        <p>Work in Schedule: {session.scheduledWorkTime}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyAttendanceReport;