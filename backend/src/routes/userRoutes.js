const express = require("express");

const {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  employeeDashboard,
  managerDashboard,
} = require("../controllers/userController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes below need login
router.use(protect);

// Profile routes
router.get("/profile", getMyProfile);
router.put("/profile", updateMyProfile);
router.put("/change-password", changeMyPassword);

// Role based test routes
router.get(
  "/employee-dashboard",
  authorizeRoles("employee"),
  employeeDashboard
);

router.get(
  "/manager-dashboard",
  authorizeRoles("admin","manager"),
  managerDashboard
);

module.exports = router;