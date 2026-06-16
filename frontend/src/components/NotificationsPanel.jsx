import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, RefreshCcw } from "lucide-react";
import API from "../api/axios";
import { useSocket } from "../context/SocketContext";

const notificationStyle = {
  user_online: "border-emerald-200 bg-emerald-50",
  user_offline: "border-red-200 bg-red-50",
  break_started: "border-blue-200 bg-blue-50",
  break_ended: "border-slate-200 bg-slate-50",
  break_exceeded: "border-amber-200 bg-amber-50",
  leave_requested: "border-yellow-200 bg-yellow-50",
  leave_approved: "border-emerald-200 bg-emerald-50",
  leave_rejected: "border-red-200 bg-red-50",
  leave_cancelled: "border-slate-200 bg-slate-50",
  system: "border-slate-200 bg-slate-50",
};

const NotificationsPanel = () => {
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      setError("");

      const [notificationsRes, unreadRes] = await Promise.all([
        API.get("/notifications/my?limit=20"),
        API.get("/notifications/unread-count"),
      ]);

      setNotifications(notificationsRes.data.notifications || []);
      setUnreadCount(unreadRes.data.unreadCount || 0);
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to load notifications"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = () => {
      fetchNotifications();
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      setMessage("");
      setError("");

      await API.patch(`/notifications/${id}/read`);

      setNotifications((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to mark notification as read"
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      setMessage("");
      setError("");

      const response = await API.patch("/notifications/read-all");

      setMessage(response.data.message);

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to mark all notifications as read"
      );
    }
  };

  return (
    <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">
              Notifications
            </h2>

            {unreadCount > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Latest system alerts and activity updates
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchNotifications}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>

          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <CheckCheck size={16} />
            Read All
          </button>
        </div>
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

      {loading ? (
        <p className="text-sm text-slate-500">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item._id}
              className={`rounded-xl border p-4 ${
                notificationStyle[item.type] ||
                "border-slate-200 bg-slate-50"
              } ${item.isRead ? "opacity-70" : "opacity-100"}`}
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    {!item.isRead && (
                      <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                    )}

                    <h3 className="font-semibold text-slate-900">
                      {item.title}
                    </h3>
                  </div>

                  <p className="mt-1 text-sm text-slate-700">
                    {item.message}
                  </p>

                  {item.relatedUser && (
                    <p className="mt-1 text-xs text-slate-500">
                      Related user: {item.relatedUser.name}{" "}
                      {item.relatedUser.department
                        ? `| ${item.relatedUser.department}`
                        : ""}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                {!item.isRead && (
                  <button
                    onClick={() => markAsRead(item._id)}
                    className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;