import { useCallback, useEffect, useState } from "react";
import API from "../api/axios";
import { useSocket } from "../context/SocketContext";

const AdminLeaveRequests = () => {
  const { socket } = useSocket();

  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchLeaveRequests = useCallback(async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        API.get("/leaves/pending"),
        API.get("/leaves"),
      ]);

      setPendingRequests(pendingRes.data.leaveRequests || []);
      setAllRequests(allRes.data.leaveRequests || []);
    } catch (error) {
      console.log(error.response?.data?.message || error.message);
    }
  }, []);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  useEffect(() => {
    if (!socket) return;

    socket.on("leave:requested", fetchLeaveRequests);
    socket.on("leave:updated", fetchLeaveRequests);
    socket.on("leave:cancelled", fetchLeaveRequests);
    socket.on("notification:new", fetchLeaveRequests);

    return () => {
      socket.off("leave:requested", fetchLeaveRequests);
      socket.off("leave:updated", fetchLeaveRequests);
      socket.off("leave:cancelled", fetchLeaveRequests);
      socket.off("notification:new", fetchLeaveRequests);
    };
  }, [socket, fetchLeaveRequests]);

  const approveLeave = async (id) => {
    try {
      setError("");
      setMessage("");

      const response = await API.patch(`/leaves/${id}/approve`, {
        adminComment: "Approved",
      });

      setMessage(response.data.message);
      fetchLeaveRequests();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to approve leave");
    }
  };

  const rejectLeave = async (id) => {
    const adminComment = prompt("Reason for rejection:");

    try {
      setError("");
      setMessage("");

      const response = await API.patch(`/leaves/${id}/reject`, {
        adminComment: adminComment || "Rejected",
      });

      setMessage(response.data.message);
      fetchLeaveRequests();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to reject leave");
    }
  };

  return (
    <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Leave Requests
          </h2>
          <p className="text-sm text-slate-500">
            Pending requests: {pendingRequests.length}
          </p>
        </div>

        <button
          onClick={fetchLeaveRequests}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Refresh
        </button>
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

      <h3 className="mb-3 font-semibold text-slate-900">
        Pending Approval
      </h3>

      {pendingRequests.length === 0 ? (
        <p className="mb-6 text-sm text-slate-500">
          No pending leave requests.
        </p>
      ) : (
        <div className="mb-8 space-y-3">
          {pendingRequests.map((item) => (
            <div
              key={item._id}
              className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.employee?.name}
                  </p>
                  <p className="text-slate-600">
                    {item.leaveType.replace("_", " ")} | {item.startDate} to{" "}
                    {item.endDate} | {item.numberOfDays} day(s)
                  </p>
                  <p className="mt-1 text-slate-600">
                    Reason: {item.reason}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => approveLeave(item._id)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => rejectLeave(item._id)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="mb-3 font-semibold text-slate-900">
        Recent Leave Requests
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {allRequests.slice(0, 10).map((item) => (
              <tr key={item._id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  {item.employee?.name || "-"}
                </td>
                <td className="px-4 py-3 capitalize">
                  {item.leaveType.replace("_", " ")}
                </td>
                <td className="px-4 py-3">
                  {item.startDate} to {item.endDate}
                </td>
                <td className="px-4 py-3">{item.numberOfDays}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : item.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : item.status === "cancelled"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {allRequests.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-500">
            No leave requests found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeaveRequests;