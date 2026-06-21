const express = require("express");

const {
  getMeetingInviteUsers,
  createMeeting,
  getActiveMeeting,
  getAdminMeetings,
  getMeetingById,
  startMeeting,
  endMeeting,
  joinMeeting,
} = require("../controllers/meetingController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  };
};

router.use(protect);

router.get(
  "/active",
  requireRoles("admin", "manager", "employee"),
  getActiveMeeting
);

router.post(
  "/:id/join",
  requireRoles("admin", "manager", "employee"),
  joinMeeting
);

router.get("/invite-users", requireRoles("admin"), getMeetingInviteUsers);
router.post("/", requireRoles("admin"), createMeeting);
router.get("/admin", requireRoles("admin"), getAdminMeetings);
router.get("/:id", requireRoles("admin"), getMeetingById);
router.patch("/:id/start", requireRoles("admin"), startMeeting);
router.patch("/:id/end", requireRoles("admin"), endMeeting);

module.exports = router;