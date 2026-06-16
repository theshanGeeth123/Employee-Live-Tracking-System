const express = require("express");

const {
  getLeaveTypes,
  requestLeave,
  getMyLeaveRequests,
  getAllLeaveRequests,
  getPendingLeaveRequests,
  getTodayApprovedLeaves,
  getLeaveRequestById,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelMyLeaveRequest,
} = require("../controllers/leaveController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/types", getLeaveTypes);

router.post(
  "/request",
  authorizeRoles("employee", "manager"),
  requestLeave
);

router.get("/my-requests", getMyLeaveRequests);

router.get(
  "/pending",
  authorizeRoles("admin", "manager"),
  getPendingLeaveRequests
);

router.get(
  "/today-approved",
  authorizeRoles("admin", "manager"),
  getTodayApprovedLeaves
);

router.get(
  "/",
  authorizeRoles("admin", "manager"),
  getAllLeaveRequests
);

router.get("/:id", getLeaveRequestById);

router.patch(
  "/:id/approve",
  authorizeRoles("admin"),
  approveLeaveRequest
);

router.patch(
  "/:id/reject",
  authorizeRoles("admin"),
  rejectLeaveRequest
);

router.patch(
  "/:id/cancel",
  authorizeRoles("employee", "manager"),
  cancelMyLeaveRequest
);

module.exports = router;