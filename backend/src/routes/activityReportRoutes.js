const express = require("express");

const {
  getActivityReportSummary,
  getActivityReportSettings,
  updateActivityReportSettings,
} = require("../controllers/activityReportController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get(
  "/summary",
  authorizeRoles("admin", "manager"),
  getActivityReportSummary
);

router.get(
  "/settings",
  authorizeRoles("admin", "manager"),
  getActivityReportSettings
);

router.put(
  "/settings",
  authorizeRoles("admin"),
  updateActivityReportSettings
);

module.exports = router;