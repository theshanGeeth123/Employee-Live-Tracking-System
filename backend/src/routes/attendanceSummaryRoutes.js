const express = require("express");

const {
  getTodayAttendanceSummary,
} = require("../controllers/attendanceSummaryController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get(
  "/today",
  authorizeRoles("admin", "manager"),
  getTodayAttendanceSummary
);

module.exports = router;