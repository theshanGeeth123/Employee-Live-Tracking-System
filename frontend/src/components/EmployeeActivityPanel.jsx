import { useCallback, useEffect, useState } from "react";
import API from "../api/axios";
import { useSocket } from "../context/SocketContext";

const EmployeeActivityPanel = () => {
  const { connected, socket } = useSocket();

  const [todaySession, setTodaySession] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchMyData = useCallback(async () => {
    try {
      const [sessionRes, breaksRes] = await Promise.all([
        API.get("/work-sessions/my-today"),
        API.get("/breaks/my-today"),
      ]);

      setTodaySession(sessionRes.data.session);
      setBreaks(breaksRes.data.breaks || []);
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

    return () => {
      socket.off("presence:connected", fetchMyData);
      socket.off("presence:user_updated", fetchMyData);
    };
  }, [socket, fetchMyData]);

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

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          My Activity
        </h2>
        <p className="text-sm text-slate-500">
          Socket:{" "}
          <span className={connected ? "text-emerald-600" : "text-red-600"}>
            {connected ? "Connected / Active" : "Disconnected"}
          </span>
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
        <h3 className="mb-4 font-semibold text-slate-900">
          Break Controls
        </h3>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => startBreak("breakfast")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Start Breakfast
          </button>

          <button
            onClick={() => startBreak("lunch")}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Start Lunch
          </button>

          <button
            onClick={() => startBreak("tea")}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Start Tea
          </button>

          <button
            onClick={endBreak}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            End Break
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-5">
        <h3 className="mb-4 font-semibold text-slate-900">Today Breaks</h3>

        {breaks.length === 0 ? (
          <p className="text-sm text-slate-500">No breaks today.</p>
        ) : (
          <div className="space-y-3">
            {breaks.map((item) => (
              <div
                key={item._id}
                className="rounded-lg border border-slate-200 p-4 text-sm"
              >
                <div className="font-semibold capitalize">
                  {item.breakType}
                </div>
                <div className="text-slate-500">
                  Used: {item.usedTime} | Exceeded: {item.exceededTime}
                </div>
                <div className="text-slate-500">
                  Status: {item.isOpen ? "Running" : "Ended"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeActivityPanel;