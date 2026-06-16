const Notification = require("../models/Notification");

// @desc    Get my notifications
// @route   GET /api/notifications/my
// @access  Private
const getMyNotifications = async (req, res) => {
  try {
    const { unreadOnly, limit = 50 } = req.query;

    const filter = {
      $or: [
        { targetUser: req.user._id },
        { targetRoles: req.user.role },
      ],
    };

    if (unreadOnly === "true") {
      filter.readBy = {
        $not: {
          $elemMatch: {
            user: req.user._id,
          },
        },
      };
    }

    const notifications = await Notification.find(filter)
      .populate("targetUser", "name email role")
      .populate("relatedUser", "name email role department position")
      .populate("relatedLeaveRequest")
      .populate("relatedBreakLog")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const formattedNotifications = notifications.map((notification) => {
      const item = notification.toObject();

      const isRead = item.readBy.some(
        (readItem) => readItem.user.toString() === req.user._id.toString()
      );

      return {
        ...item,
        isRead,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedNotifications.length,
      notifications: formattedNotifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get notifications",
      error: error.message,
    });
  }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadNotificationCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      $or: [
        { targetUser: req.user._id },
        { targetRoles: req.user.role },
      ],
      readBy: {
        $not: {
          $elemMatch: {
            user: req.user._id,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get unread notification count",
      error: error.message,
    });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const canAccess =
      notification.targetUser?.toString() === req.user._id.toString() ||
      notification.targetRoles.includes(req.user.role);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this notification",
      });
    }

    const alreadyRead = notification.readBy.some(
      (item) => item.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      notification.readBy.push({
        user: req.user._id,
        readAt: new Date(),
      });

      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

// @desc    Mark all my notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { targetUser: req.user._id },
        { targetRoles: req.user.role },
      ],
      readBy: {
        $not: {
          $elemMatch: {
            user: req.user._id,
          },
        },
      },
    });

    for (const notification of notifications) {
      notification.readBy.push({
        user: req.user._id,
        readAt: new Date(),
      });

      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      updatedCount: notifications.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
      error: error.message,
    });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};