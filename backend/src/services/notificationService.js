const Notification = require("../models/Notification");

const createNotification = async ({
  type,
  title,
  message,
  targetRoles = [],
  targetUser = null,
  relatedUser = null,
  relatedLeaveRequest = null,
  relatedBreakLog = null,
  metadata = {},
}) => {
  const notification = await Notification.create({
    type,
    title,
    message,
    targetRoles,
    targetUser,
    relatedUser,
    relatedLeaveRequest,
    relatedBreakLog,
    metadata,
  });

  return await Notification.findById(notification._id)
    .populate("targetUser", "name email role")
    .populate("relatedUser", "name email role department position")
    .populate("relatedLeaveRequest")
    .populate("relatedBreakLog");
};

const emitNotification = (io, notification) => {
  if (!io || !notification) return;

  const payload = {
    type: "NOTIFICATION",
    notification,
    time: new Date(),
  };

  if (notification.targetRoles?.includes("admin")) {
    io.to("admins").emit("notification:new", payload);
  }

  if (notification.targetUser) {
    io.to(`user:${notification.targetUser._id || notification.targetUser}`).emit(
      "notification:new",
      payload
    );
  }
};

module.exports = {
  createNotification,
  emitNotification,
};