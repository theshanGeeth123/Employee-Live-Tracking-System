import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  Printer,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  getActivityReport,
  getActivityReportSettings,
  updateActivityReportSettings,
} from "../api/activityReportApi";
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

const formatDateOnly = (value) => {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const statusClass = {
  Present: "bg-emerald-100 text-emerald-700",
  Partial: "bg-blue-100 text-blue-700",
  Absent: "bg-red-100 text-red-700",
  "On Leave": "bg-purple-100 text-purple-700",
  "Non Working Day": "bg-slate-100 text-slate-600",
};

const workingDayOptions = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const buildCsv = (report) => {
  const headers = [
    "Employee Name",
    "Email",
    "Role",
    "Department",
    "Position",
    "Report Status",
    "Expected Days",
    "Effective Expected Days",
    "Present Days",
    "Absent Days",
    "Leave Days",
    "Late Days",
    "Early Checkout Days",
    "First Login",
    "Last Seen",
    "Expected Time",
    "Work Time",
    "Online Time",
    "Break Time",
    "Idle Time",
    "Overtime",
    "Shortage",
  ];

  const rows = (report?.rows || []).map((row) => [
    row.user?.name || "",
    row.user?.email || "",
    row.user?.role || "",
    row.user?.department || "",
    row.user?.position || "",
    row.status || "",
    row.expectedDays || 0,
    row.effectiveExpectedDays || 0,
    row.presentDays || 0,
    row.absentDays || 0,
    row.leaveDays || 0,
    row.lateDays || 0,
    row.earlyCheckoutDays || 0,
    formatDateTime(row.firstLogin),
    formatDateTime(row.lastSeen),
    row.expectedTime || "0h 0m 0s",
    row.workTime || "0h 0m 0s",
    row.onlineTime || "0h 0m 0s",
    row.breakTime || "0h 0m 0s",
    row.idleTime || "0h 0m 0s",
    row.overtime || "0h 0m 0s",
    row.shortage || "0h 0m 0s",
  ]);

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
};

const ActivityReportsPanel = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const isAdmin = user?.role === "admin";

  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(todayInputValue());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [settings, setSettings] = useState({
    workStartTime: "08:30",
    workEndTime: "17:30",
    graceMinutes: 15,
    workingDays: [1, 2, 3, 4, 5],
  });

  const [settingsForm, setSettingsForm] = useState({
    workStartTime: "08:30",
    workEndTime: "17:30",
    graceMinutes: 15,
    workingDays: [1, 2, 3, 4, 5],
  });

  const [report, setReport] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const selectedRow = useMemo(() => {
    return (
      report?.rows?.find((row) => row.user?._id === selectedEmployeeId) || null
    );
  }, [report, selectedEmployeeId]);

  const reportIncludesToday = useMemo(() => {
    if (!report?.startDate || !report?.endDate) return false;

    const today = todayInputValue();
    return report.startDate <= today && report.endDate >= today;
  }, [report]);

  const loadSettings = useCallback(async () => {
    const data = await getActivityReportSettings();

    const loadedSettings = data.settings || {
      workStartTime: "08:30",
      workEndTime: "17:30",
      graceMinutes: 15,
      workingDays: [1, 2, 3, 4, 5],
    };

    setSettings(loadedSettings);
    setSettingsForm({
      workStartTime: loadedSettings.workStartTime || "08:30",
      workEndTime: loadedSettings.workEndTime || "17:30",
      graceMinutes: loadedSettings.graceMinutes ?? 15,
      workingDays: loadedSettings.workingDays || [1, 2, 3, 4, 5],
    });
  }, []);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getActivityReport({
        type: reportType,
        date: selectedDate,
        search,
        role: roleFilter,
      });

      const loadedReport = data.report || null;

      setReport(loadedReport);
      setLastUpdated(new Date());

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
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to load activity report"
      );
    } finally {
      setLoading(false);
    }
  }, [reportType, selectedDate, search, roleFilter]);

  useEffect(() => {
    loadSettings().catch((error) => {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to load activity report settings"
      );
    });
  }, [loadSettings]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (!socket || !reportIncludesToday) return;

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
    ];

    events.forEach((eventName) => {
      socket.on(eventName, loadReport);
    });

    return () => {
      events.forEach((eventName) => {
        socket.off(eventName, loadReport);
      });
    };
  }, [socket, reportIncludesToday, loadReport]);

  const handleSettingsChange = (event) => {
    const { name, value } = event.target;

    setSettingsForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const toggleWorkingDay = (day) => {
    setSettingsForm((previous) => {
      const exists = previous.workingDays.includes(day);

      return {
        ...previous,
        workingDays: exists
          ? previous.workingDays.filter((item) => item !== day)
          : [...previous.workingDays, day].sort((a, b) => a - b),
      };
    });
  };

  const saveSettings = async () => {
    try {
      setSettingsLoading(true);
      setError("");
      setSuccess("");

      const data = await updateActivityReportSettings({
        workStartTime: settingsForm.workStartTime,
        workEndTime: settingsForm.workEndTime,
        graceMinutes: Number(settingsForm.graceMinutes || 0),
        workingDays: settingsForm.workingDays,
      });

      setSettings(data.settings);
      setSuccess(data.message || "Report settings updated successfully");
      await loadReport();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to update report settings"
      );
    } finally {
      setSettingsLoading(false);
    }
  };

  const exportCSV = () => {
    if (!report) return;

    const csv = buildCsv(report);

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `activity-report-${report.type}-${report.startDate}-to-${report.endDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const summary = report?.summary || {};

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Activity Reports
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Track historical attendance, active time, break time, late logins,
              early checkouts, overtime, and shortages.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {report ? (
                <>
                  Range: {report.startDate} to {report.endDate}
                </>
              ) : (
                "Select filters to generate a report"
              )}

              {lastUpdated && (
                <> | Last updated: {lastUpdated.toLocaleTimeString()}</>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadReport}
              disabled={loading}
              type="button"
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCcw size={16} />
              {loading ? "Loading..." : "Refresh"}
            </button>

            <button
              onClick={exportCSV}
              disabled={!report}
              type="button"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
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

        {success && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="mb-6 grid gap-4 lg:grid-cols-5">
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
              <SlidersHorizontal size={14} /> Report Type
            </label>

            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
              <CalendarDays size={14} /> Select Date
            </label>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
              <Search size={14} /> Search User
            </label>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or email..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Role
            </label>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="employee">Employees</option>
              <option value="manager">Managers</option>
            </select>
          </div>

          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs font-bold uppercase text-blue-500">
              Report Rule
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
              <h3 className="font-bold text-slate-900">
                Activity Report Working Time Setting
              </h3>

              <p className="text-sm text-slate-500">
                These values are used only for report calculations. Your live
                Attendance Report page remains unchanged.
              </p>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_2fr_1fr]">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Start Time
                </label>

                <input
                  type="time"
                  name="workStartTime"
                  value={settingsForm.workStartTime}
                  onChange={handleSettingsChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  End Time
                </label>

                <input
                  type="time"
                  name="workEndTime"
                  value={settingsForm.workEndTime}
                  onChange={handleSettingsChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Grace Minutes
                </label>

                <input
                  type="number"
                  min="0"
                  name="graceMinutes"
                  value={settingsForm.graceMinutes}
                  onChange={handleSettingsChange}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Working Days
                </label>

                <div className="flex flex-wrap gap-2">
                  {workingDayOptions.map((day) => {
                    const selected = settingsForm.workingDays.includes(
                      day.value
                    );

                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleWorkingDay(day.value)}
                        className={`rounded-lg px-3 py-2 text-xs font-bold ${
                          selected
                            ? "bg-blue-600 text-white"
                            : "bg-white text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={settingsLoading}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {settingsLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Users</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              {summary.totalUsers || 0}
            </h3>
          </div>

          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-xs text-slate-500">Present</p>
            <h3 className="mt-1 text-2xl font-bold text-emerald-700">
              {summary.presentUsers || 0}
            </h3>
          </div>

          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-xs text-slate-500">Absent</p>
            <h3 className="mt-1 text-2xl font-bold text-red-700">
              {summary.absentUsers || 0}
            </h3>
          </div>

          <div className="rounded-xl bg-purple-50 p-4">
            <p className="text-xs text-slate-500">Leave</p>
            <h3 className="mt-1 text-2xl font-bold text-purple-700">
              {summary.leaveUsers || 0}
            </h3>
          </div>

          <div className="rounded-xl bg-yellow-50 p-4">
            <p className="text-xs text-slate-500">Late</p>
            <h3 className="mt-1 text-2xl font-bold text-yellow-700">
              {summary.lateUsers || 0}
            </h3>
          </div>

          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs text-slate-500">Work</p>
            <h3 className="mt-1 text-sm font-black text-blue-700">
              {summary.totalWorkTime || "0h 0m 0s"}
            </h3>
          </div>

          <div className="rounded-xl bg-indigo-50 p-4">
            <p className="text-xs text-slate-500">Overtime</p>
            <h3 className="mt-1 text-sm font-black text-indigo-700">
              {summary.totalOvertime || "0h 0m 0s"}
            </h3>
          </div>

          <div className="rounded-xl bg-orange-50 p-4">
            <p className="text-xs text-slate-500">Shortage</p>
            <h3 className="mt-1 text-sm font-black text-orange-700">
              {summary.totalShortage || "0h 0m 0s"}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Late / Early</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Work</th>
                  <th className="px-4 py-3">Online</th>
                  <th className="px-4 py-3">Break</th>
                  <th className="px-4 py-3">Overtime</th>
                  <th className="px-4 py-3">Shortage</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Loading activity report...
                    </td>
                  </tr>
                ) : !report?.rows?.length ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No report records found.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row) => (
                    <tr
                      key={row.user?._id}
                      onClick={() => setSelectedEmployeeId(row.user?._id)}
                      className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${
                        selectedEmployeeId === row.user?._id
                          ? "bg-blue-50"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {row.user?.name || "-"}
                        </div>

                        <div className="text-xs text-slate-500">
                          {row.user?.email || "-"}
                        </div>

                        <div className="text-xs capitalize text-slate-400">
                          {row.user?.department || "-"}{" "}
                          {row.user?.position
                            ? `| ${row.user.position}`
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
                          {row.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600">
                        <p>{row.presentDays || 0} present</p>
                        <p>{row.absentDays || 0} absent</p>
                        <p>{row.leaveDays || 0} leave</p>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600">
                        <p>{row.lateDays || 0} late</p>
                        <p>{row.earlyCheckoutDays || 0} early</p>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {row.expectedTime || "0h 0m 0s"}
                      </td>

                      <td className="px-4 py-3 font-semibold text-blue-700">
                        {row.workTime || "0h 0m 0s"}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {row.onlineTime || "0h 0m 0s"}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {row.breakTime || "0h 0m 0s"}
                      </td>

                      <td className="px-4 py-3 font-semibold text-indigo-700">
                        {row.overtime || "0h 0m 0s"}
                      </td>

                      <td className="px-4 py-3 font-semibold text-red-600">
                        {row.shortage || "0h 0m 0s"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {!selectedRow ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Select an employee to view detailed day-by-day records.
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedRow.user?.name}
                </h3>

                <p className="text-sm text-slate-500">
                  {selectedRow.user?.email}
                </p>

                <p className="text-xs capitalize text-slate-400">
                  {selectedRow.user?.role}
                </p>
              </div>

              <div className="mb-5 grid gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    First Login / Last Seen
                  </p>

                  <p className="text-sm font-bold text-slate-800">
                    {formatDateTime(selectedRow.firstLogin)}
                  </p>

                  <p className="text-sm font-bold text-slate-800">
                    {formatDateTime(selectedRow.lastSeen)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Online
                    </p>

                    <p className="font-bold text-slate-800">
                      {selectedRow.onlineTime}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Idle
                    </p>

                    <p className="font-bold text-slate-800">
                      {selectedRow.idleTime}
                    </p>
                  </div>
                </div>
              </div>

              <h4 className="mb-3 font-bold text-slate-900">
                Day-by-day Details
              </h4>

              <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                {selectedRow.sessions?.map((session) => (
                  <div
                    key={session.date}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">
                          {formatDateOnly(session.date)}
                        </p>

                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                            statusClass[session.status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap justify-end gap-1">
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

                    <div className="grid gap-2 text-xs text-slate-600">
                      <p>First Login: {formatDateTime(session.firstLoginAt)}</p>
                      <p>Last Seen: {formatDateTime(session.lastSeenAt)}</p>
                      <p>Expected: {session.expectedTime}</p>
                      <p>Work: {session.workTime}</p>
                      <p>Online: {session.onlineTime}</p>
                      <p>Break: {session.breakTime}</p>
                      <p>Idle: {session.idleTime}</p>
                      <p>Overtime: {session.overtime}</p>
                      <p>Shortage: {session.shortage}</p>
                    </div>

                    {session.approvedLeave && (
                      <div className="mt-3 rounded-lg bg-purple-50 p-3 text-xs text-purple-700">
                        Approved Leave: {session.approvedLeave.leaveType} |{" "}
                        {session.approvedLeave.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityReportsPanel;