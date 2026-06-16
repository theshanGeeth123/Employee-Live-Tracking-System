import { useCallback, useEffect, useState } from "react";
import { CalendarDays, RefreshCcw } from "lucide-react";
import API from "../api/axios";
import { useSocket } from "../context/SocketContext";

const getSriLankaDateString = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
  }).format(new Date());
};

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const statusBadge = {
  Running: "bg-amber-100 text-amber-700",
  Ended: "bg-emerald-100 text-emerald-700",
};

const AdminBreakReport = () => {
  const { socket } = useSocket();

  const [selectedDate, setSelectedDate] = useState(getSriLankaDateString());
  const [breaks, setBreaks] = useState([]);
  const [rules, setRules] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBreakReport = useCallback(async () => {
    try {
      setError("");

      const [breakRes, rulesRes] = await Promise.all([
        API.get(`/breaks/today?date=${selectedDate}`),
        API.get("/breaks/rules"),
      ]);

      setBreaks(breakRes.data.breaks || []);
      setRules(rulesRes.data.rules || {});
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load break report");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchBreakReport();
  }, [fetchBreakReport]);

  useEffect(() => {
    if (!socket) return;

    socket.on("break:started", fetchBreakReport);
    socket.on("break:ended", fetchBreakReport);
    socket.on("break:exceeded", fetchBreakReport);

    return () => {
      socket.off("break:started", fetchBreakReport);
      socket.off("break:ended", fetchBreakReport);
      socket.off("break:exceeded", fetchBreakReport);
    };
  }, [socket, fetchBreakReport]);

  const stats = {
    total: breaks.length,
    running: breaks.filter((item) => item.isOpen).length,
    ended: breaks.filter((item) => !item.isOpen).length,
    exceeded: breaks.filter((item) => item.isExceeded).length,
    breakfast: breaks.filter((item) => item.breakType === "breakfast").length,
    lunch: breaks.filter((item) => item.breakType === "lunch").length,
    tea: breaks.filter((item) => item.breakType === "tea").length,
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">
              Break Report
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Select a date and view all employee break details
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setLoading(true);
              setSelectedDate(e.target.value);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          />

          <button
            onClick={fetchBreakReport}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-7">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total</p>
          <h3 className="text-2xl font-bold">{stats.total}</h3>
        </div>

        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-xs text-slate-500">Running</p>
          <h3 className="text-2xl font-bold text-amber-700">
            {stats.running}
          </h3>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs text-slate-500">Ended</p>
          <h3 className="text-2xl font-bold text-emerald-700">
            {stats.ended}
          </h3>
        </div>

        <div className="rounded-xl bg-red-50 p-4">
          <p className="text-xs text-slate-500">Exceeded</p>
          <h3 className="text-2xl font-bold text-red-700">
            {stats.exceeded}
          </h3>
        </div>

        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-xs text-slate-500">Breakfast</p>
          <h3 className="text-2xl font-bold text-blue-700">
            {stats.breakfast}
          </h3>
        </div>

        <div className="rounded-xl bg-orange-50 p-4">
          <p className="text-xs text-slate-500">Lunch</p>
          <h3 className="text-2xl font-bold text-orange-700">
            {stats.lunch}
          </h3>
        </div>

        <div className="rounded-xl bg-purple-50 p-4">
          <p className="text-xs text-slate-500">Tea</p>
          <h3 className="text-2xl font-bold text-purple-700">
            {stats.tea}
          </h3>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 p-5">
        <h3 className="mb-3 font-semibold text-slate-900">
          Current Break Rules
        </h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {["breakfast", "lunch", "tea"].map((breakType) => {
            const rule = rules[breakType];

            return (
              <div
                key={breakType}
                className="rounded-xl border border-slate-200 p-4 text-sm"
              >
                <p className="font-semibold text-slate-900">
                  {rule?.label || breakType}
                </p>

                <p className="text-slate-500">
                  Window: {rule?.startTime || "-"} - {rule?.endTime || "-"}
                </p>

                <p className="text-slate-500">
                  Allowed: {rule?.allowedMinutes || 0} minutes
                </p>

                <p className="text-slate-500">
                  One per day: {rule?.onePerDay ? "Yes" : "No"}
                </p>

                <p className="text-slate-500">
                  Enabled: {rule?.enabled ? "Yes" : "No"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading break report...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Break Type</th>
                  <th className="px-4 py-3">Allowed</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Used</th>
                  <th className="px-4 py-3">Exceeded</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {breaks.map((item) => (
                  <tr key={item._id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {item.employee?.name || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.employee?.email || "-"}
                      </div>
                    </td>

                    <td className="px-4 py-3 capitalize">
                      {item.breakType}
                    </td>

                    <td className="px-4 py-3">
                      {item.allowedMinutes} min
                    </td>

                    <td className="px-4 py-3">
                      {formatDateTime(item.startTime)}
                    </td>

                    <td className="px-4 py-3">
                      {formatDateTime(item.endTime)}
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      {item.usedTime}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={
                          item.isExceeded
                            ? "font-semibold text-red-600"
                            : "text-slate-600"
                        }
                      >
                        {item.exceededTime}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.isOpen
                            ? statusBadge.Running
                            : statusBadge.Ended
                        }`}
                      >
                        {item.isOpen ? "Running" : "Ended"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {breaks.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                No break records found for {selectedDate}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBreakReport;