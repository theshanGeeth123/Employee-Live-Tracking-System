const express = require("express");

const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/my", getMyNotifications);
router.get("/unread-count", getUnreadNotificationCount);

router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/:id/read", markNotificationAsRead);

module.exports = router;