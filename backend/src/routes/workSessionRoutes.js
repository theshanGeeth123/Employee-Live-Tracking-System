const express = require("express");

const {
  getTodaySessions,
  getMyTodaySession,
  getEmployeeTodayLogs,
} = require("../controllers/workSessionController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/my-today", getMyTodaySession);

router.get(
  "/today",
  authorizeRoles("admin", "manager"),
  getTodaySessions
);

router.get(
  "/:employeeId/logs/today",
  authorizeRoles("admin", "manager"),
  getEmployeeTodayLogs
);

module.exports = router;