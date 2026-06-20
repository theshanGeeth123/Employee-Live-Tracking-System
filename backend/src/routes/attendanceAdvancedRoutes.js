const express = require("express");

const {
  getAttendanceSettings,
  updateAttendanceSettings,
  getAdvancedAttendanceReport,
} = require("../controllers/attendanceAdvancedController");

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
  "/settings",
  requireRoles("admin", "manager"),
  getAttendanceSettings
);

router.patch(
  "/settings",
  requireRoles("admin"),
  updateAttendanceSettings
);

router.get(
  "/report",
  requireRoles("admin", "manager"),
  getAdvancedAttendanceReport
);

module.exports = router;