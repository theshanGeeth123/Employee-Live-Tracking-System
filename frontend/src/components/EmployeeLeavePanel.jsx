import { useEffect, useState } from "react";
import API from "../api/axios";

const EmployeeLeavePanel = () => {
  const [leaveTypes, setLeaveTypes] = useState({});
  const [myRequests, setMyRequests] = useState([]);
  const [formData, setFormData] = useState({
    leaveType: "casual",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchLeaveTypes = async () => {
    try {
      const response = await API.get("/leaves/types");
      setLeaveTypes(response.data.leaveTypes || {});
    } catch (error) {
      console.log(error.response?.data?.message || error.message);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await API.get("/leaves/my-requests");
      setMyRequests(response.data.leaveRequests || []);
    } catch (error) {
      console.log(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
    fetchMyRequests();
  }, []);

  const handleChange = (e) => {
    setError("");
    setMessage("");

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const submitLeaveRequest = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setMessage("");

      const response = await API.post("/leaves/request", formData);

      setMessage(response.data.message);

      setFormData({
        leaveType: "casual",
        startDate: "",
        endDate: "",
        reason: "",
      });

      fetchMyRequests();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to request leave");
    }
  };

  const cancelRequest = async (id) => {
    try {
      setError("");
      setMessage("");

      const response = await API.patch(`/leaves/${id}/cancel`);

      setMessage(response.data.message);
      fetchMyRequests();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to cancel request");
    }
  };

  return (
    <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Leave Request
      </h2>

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

      <form onSubmit={submitLeaveRequest} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Leave Type
          </label>

          <select
            name="leaveType"
            value={formData.leaveType}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
          >
            {Object.entries(leaveTypes).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Start Date
          </label>

          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            End Date
          </label>

          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Reason
          </label>

          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder="Enter your reason"
            className="min-h-24 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
            required
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Submit Leave Request
          </button>
        </div>
      </form>

      <div className="mt-8">
        <h3 className="mb-3 font-semibold text-slate-900">
          My Leave Requests
        </h3>

        {myRequests.length === 0 ? (
          <p className="text-sm text-slate-500">No leave requests yet.</p>
        ) : (
          <div className="space-y-3">
            {myRequests.map((item) => (
              <div
                key={item._id}
                className="rounded-xl border border-slate-200 p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize text-slate-900">
                      {item.leaveType.replace("_", " ")}
                    </p>
                    <p className="text-slate-500">
                      {item.startDate} to {item.endDate} | {item.numberOfDays} day(s)
                    </p>
                    <p className="mt-1 text-slate-600">{item.reason}</p>
                    {item.adminComment && (
                      <p className="mt-1 text-slate-500">
                        Admin comment: {item.adminComment}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
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

                    {item.status === "pending" && (
                      <button
                        onClick={() => cancelRequest(item._id)}
                        className="mt-3 block rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeLeavePanel;