import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import { useSocket } from "../context/SocketContext";

const getSriLankaDateString = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
  }).format(new Date());
};

const getSriLankaTimeString = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = parts.find((part) => part.type === "hour")?.value || "00";
  const minute = parts.find((part) => part.type === "minute")?.value || "00";

  return `${hour}:${minute}`;
};

const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
};

const isNowWithinWindow = (startTime, endTime) => {
  const now = timeToMinutes(getSriLankaTimeString());
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start <= end) {
    return now >= start && now <= end;
  }

  return now >= start || now <= end;
};

const formatSeconds = (seconds = 0) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hrs}h ${mins}m ${secs}s`;
};

const getDurationSeconds = (startTime) => {
  if (!startTime) return 0;
  return Math.max(0, Math.floor((new Date() - new Date(startTime)) / 1000));
};

const breakButtonClass = {
  breakfast: "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300",
  lunch: "bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300",
  tea: "bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300",
};

const EmployeeActivityPanel = () => {
  const { connected, socket } = useSocket();

  const [todaySession, setTodaySession] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [breakRules, setBreakRules] = useState({});
  const [runningSeconds, setRunningSeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(getSriLankaTimeString());

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchMyData = useCallback(async () => {
    try {
      const [sessionRes, breaksRes, rulesRes] = await Promise.all([
        API.get("/work-sessions/my-today"),
        API.get("/breaks/my-today"),
        API.get("/breaks/rules"),
      ]);

      setTodaySession(sessionRes.data.session);
      setBreaks(breaksRes.data.breaks || []);
      setBreakRules(rulesRes.data.rules || {});
    } catch (error) {
      console.log(error.response?.data?.message || error.message);
    }
  }, []);

  useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  useEffect(() => {
    if (!socket) return;

    socket.on("presence:connected", fetchMyData);
    socket.on("presence:user_updated", fetchMyData);
    socket.on("break:started", fetchMyData);
    socket.on("break:ended", fetchMyData);
    socket.on("break:exceeded", fetchMyData);

    return () => {
      socket.off("presence:connected", fetchMyData);
      socket.off("presence:user_updated", fetchMyData);
      socket.off("break:started", fetchMyData);
      socket.off("break:ended", fetchMyData);
      socket.off("break:exceeded", fetchMyData);
    };
  }, [socket, fetchMyData]);

  const activeBreak = useMemo(() => {
    return breaks.find((item) => item.isOpen);
  }, [breaks]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getSriLankaTimeString());

      if (activeBreak?.startTime) {
        setRunningSeconds(getDurationSeconds(activeBreak.startTime));
      } else {
        setRunningSeconds(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBreak]);

  const alreadyTakenBreakTypes = useMemo(() => {
    return new Set(breaks.map((item) => item.breakType));
  }, [breaks]);

  const startBreak = async (breakType) => {
    try {
      setError("");
      setMessage("");

      const response = await API.post("/breaks/start", { breakType });

      setMessage(response.data.message);
      fetchMyData();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to start break");
    }
  };

  const endBreak = async () => {
    try {
      setError("");
      setMessage("");

      const response = await API.post("/breaks/end");

      setMessage(response.data.message);
      fetchMyData();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to end break");
    }
  };

  const getBreakAvailability = (breakType) => {
    const rule = breakRules[breakType];

    if (!rule) {
      return {
        disabled: true,
        reason: "Rule not loaded",
      };
    }

    if (!rule.enabled) {
      return {
        disabled: true,
        reason: "Disabled by admin",
      };
    }

    if (activeBreak) {
      return {
        disabled: true,
        reason: `Currently on ${activeBreak.breakType} break`,
      };
    }

    if (rule.onePerDay && alreadyTakenBreakTypes.has(breakType)) {
      return {
        disabled: true,
        reason: "Already used today",
      };
    }

    if (!isNowWithinWindow(rule.startTime, rule.endTime)) {
      return {
        disabled: true,
        reason: `Allowed only ${rule.startTime} - ${rule.endTime}`,
      };
    }

    return {
      disabled: false,
      reason: "Available now",
    };
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">My Activity</h2>

        <p className="text-sm text-slate-500">
          Socket:{" "}
          <span className={connected ? "text-emerald-600" : "text-red-600"}>
            {connected ? "Connected / Active" : "Disconnected"}
          </span>
          {" | "}Sri Lanka Time:{" "}
          <span className="font-semibold text-slate-700">{currentTime}</span>
        </p>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeBreak && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold capitalize text-amber-800">
            Running Break: {activeBreak.breakType}
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-900">
            {formatSeconds(runningSeconds)}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            This timer will keep counting until you click End Break.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Current Status</p>
          <h2 className="mt-2 text-2xl font-bold text-emerald-600">
            {todaySession?.currentStatus || "Connecting"}
          </h2>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Active Time</p>
          <h2 className="mt-2 text-2xl font-bold">
            {todaySession?.totalActiveTime || "0h 0m 0s"}
          </h2>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Break Time</p>
          <h2 className="mt-2 text-2xl font-bold">
            {todaySession?.totalBreakTime || "0h 0m 0s"}
          </h2>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-5">
        <h3 className="mb-4 font-semibold text-slate-900">Break Controls</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {["breakfast", "lunch", "tea"].map((breakType) => {
            const rule = breakRules[breakType];
            const availability = getBreakAvailability(breakType);

            return (
              <div
                key={breakType}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="font-semibold capitalize text-slate-900">
                  {rule?.label || breakType}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Time: {rule?.startTime || "-"} - {rule?.endTime || "-"}
                </p>

                <p className="text-xs text-slate-500">
                  Allowed: {rule?.allowedMinutes || 0} minutes
                </p>

                <p
                  className={`mt-2 text-xs font-semibold ${
                    availability.disabled
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {availability.reason}
                </p>

                <button
                  onClick={() => startBreak(breakType)}
                  disabled={availability.disabled}
                  className={`mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed ${
                    breakButtonClass[breakType]
                  }`}
                >
                  Start {rule?.label || breakType}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={endBreak}
          disabled={!activeBreak}
          className="mt-4 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
        >
          End Break
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-5">
        <h3 className="mb-4 font-semibold text-slate-900">
          Today Breaks — {getSriLankaDateString()}
        </h3>

        {breaks.length === 0 ? (
          <p className="text-sm text-slate-500">No breaks today.</p>
        ) : (
          <div className="space-y-3">
            {breaks.map((item) => {
              const liveUsedSeconds = item.isOpen
                ? getDurationSeconds(item.startTime)
                : item.usedSeconds || 0;

              const allowedSeconds = (item.allowedMinutes || 0) * 60;
              const liveExceededSeconds = Math.max(
                0,
                liveUsedSeconds - allowedSeconds
              );

              return (
                <div
                  key={item._id}
                  className="rounded-lg border border-slate-200 p-4 text-sm"
                >
                  <div className="font-semibold capitalize">
                    {item.breakType}
                  </div>

                  <div className="text-slate-500">
                    Used:{" "}
                    {item.isOpen
                      ? formatSeconds(liveUsedSeconds)
                      : item.usedTime}
                    {" | "}
                    Exceeded:{" "}
                    {item.isOpen
                      ? formatSeconds(liveExceededSeconds)
                      : item.exceededTime}
                  </div>

                  <div className="text-slate-500">
                    Status: {item.isOpen ? "Running" : "Ended"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeActivityPanel;