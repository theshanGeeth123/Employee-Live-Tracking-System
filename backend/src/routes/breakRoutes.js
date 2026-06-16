const express = require("express");

const {
  getBreakRules,
  startMyBreak,
  endMyBreak,
  getMyBreaksToday,
  getTodayBreaks,
} = require("../controllers/breakController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/rules", getBreakRules);

router.get("/my-today", getMyBreaksToday);

router.post(
  "/start",
  authorizeRoles("employee", "manager"),
  startMyBreak
);

router.post(
  "/end",
  authorizeRoles("employee", "manager"),
  endMyBreak
);

router.get(
  "/today",
  authorizeRoles("admin", "manager"),
  getTodayBreaks
);

module.exports = router;