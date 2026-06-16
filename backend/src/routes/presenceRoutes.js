const express = require("express");

const {
  getEmployeePresenceList,
} = require("../controllers/presenceController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get(
  "/employees",
  authorizeRoles("admin", "manager"),
  getEmployeePresenceList
);

module.exports = router;