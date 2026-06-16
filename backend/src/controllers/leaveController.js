const LeaveRequest = require("../models/LeaveRequest");
const { getSriLankaDateString } = require("../utils/dateHelper");

const {
  createNotification,
  emitNotification,
} = require("../services/notificationService");

const LEAVE_TYPES = {
  annual: {
    label: "Annual Leave",
    description: "Planned yearly leave",
  },
  casual: {
    label: "Casual Leave",
    description: "Personal or casual leave",
  },
  sick: {
    label: "Sick Leave",
    description: "Medical or health-related leave",
  },
  half_day: {
    label: "Half Day Leave",
    description: "Half working day leave",
  },
  short_leave: {
    label: "Short Leave",
    description: "Short time leave",
  },
  emergency: {
    label: "Emergency Leave",
    description: "Urgent or emergency leave",
  },
};

const sanitizeUser = (user) => {
  if (!user) return null;

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    position: user.position,
    presenceStatus: user.presenceStatus,
    lastSeenAt: user.lastSeenAt,
  };
};

const isValidDateString = (dateString) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const date = new Date(`${dateString}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime());
};

const calculateLeaveDays = (startDate, endDate, leaveType) => {
  if (leaveType === "half_day") {
    return 0.5;
  }

  if (leaveType === "short_leave") {
    return 0.25;
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  const diffMs = end - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  return diffDays;
};

// @desc    Get leave types
// @route   GET /api/leaves/types
// @access  Private
const getLeaveTypes = async (req, res) => {
  res.status(200).json({
    success: true,
    leaveTypes: LEAVE_TYPES,
  });
};

// @desc    Employee request leave
// @route   POST /api/leaves/request
// @access  Employee / Manager
const requestLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "Leave type, start date, end date and reason are required",
      });
    }

    if (!LEAVE_TYPES[leaveType]) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave type",
      });
    }

    if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date",
      });
    }

    const today = getSriLankaDateString();

    if (startDate < today && leaveType !== "emergency") {
      return res.status(400).json({
        success: false,
        message: "Past date leave requests are allowed only for emergency leave",
      });
    }

    const numberOfDays = calculateLeaveDays(startDate, endDate, leaveType);

    if (numberOfDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave duration",
      });
    }

    const overlappingRequest = await LeaveRequest.findOne({
      employee: req.user._id,
      status: { $in: ["pending", "approved"] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });

    if (overlappingRequest) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a pending or approved leave request for this date range",
      });
    }

    const leaveRequest = await LeaveRequest.create({
      employee: req.user._id,
      leaveType,
      startDate,
      endDate,
      numberOfDays,
      reason,
      status: "pending",
    });

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate(
        "employee",
        "name email role department position presenceStatus lastSeenAt"
      )
      .populate("reviewedBy", "name email role");

    const message = `${req.user.name} requested ${LEAVE_TYPES[leaveType].label}`;

    const notification = await createNotification({
      type: "leave_requested",
      title: "New Leave Request",
      message,
      targetRoles: ["admin", "manager"],
      relatedUser: req.user._id,
      relatedLeaveRequest: populatedRequest._id,
      metadata: {
        leaveType,
        startDate,
        endDate,
        numberOfDays,
      },
    });

    const io = req.app.get("io");

    if (io) {
      io.to("admins").emit("leave:requested", {
        type: "LEAVE_REQUESTED",
        message,
        leaveRequest: populatedRequest,
        time: new Date(),
      });

      emitNotification(io, notification);
    }

    res.status(201).json({
      success: true,
      message:
        "Leave request submitted successfully. It is pending until admin approval.",
      leaveRequest: populatedRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to request leave",
      error: error.message,
    });
  }
};

// @desc    Get my leave requests
// @route   GET /api/leaves/my-requests
// @access  Private
const getMyLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {
      employee: req.user._id,
    };

    if (status) {
      filter.status = status;
    }

    const leaveRequests = await LeaveRequest.find(filter)
      .populate("reviewedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaveRequests.length,
      leaveRequests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get my leave requests",
      error: error.message,
    });
  }
};

// @desc    Get all leave requests
// @route   GET /api/leaves
// @access  Admin / Manager
const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, leaveType, employee, startDate, endDate } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (leaveType) {
      filter.leaveType = leaveType;
    }

    if (employee) {
      filter.employee = employee;
    }

    if (startDate && endDate) {
      filter.startDate = { $lte: endDate };
      filter.endDate = { $gte: startDate };
    }

    const leaveRequests = await LeaveRequest.find(filter)
      .populate(
        "employee",
        "name email role department position presenceStatus lastSeenAt"
      )
      .populate("reviewedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaveRequests.length,
      leaveRequests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get leave requests",
      error: error.message,
    });
  }
};

// @desc    Get pending leave requests
// @route   GET /api/leaves/pending
// @access  Admin / Manager
const getPendingLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find({ status: "pending" })
      .populate(
        "employee",
        "name email role department position presenceStatus lastSeenAt"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaveRequests.length,
      leaveRequests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get pending leave requests",
      error: error.message,
    });
  }
};

// @desc    Get today approved leaves
// @route   GET /api/leaves/today-approved
// @access  Admin / Manager
const getTodayApprovedLeaves = async (req, res) => {
  try {
    const today = getSriLankaDateString();

    const leaveRequests = await LeaveRequest.find({
      status: "approved",
      startDate: { $lte: today },
      endDate: { $gte: today },
    })
      .populate(
        "employee",
        "name email role department position presenceStatus lastSeenAt"
      )
      .populate("reviewedBy", "name email role")
      .sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      count: leaveRequests.length,
      leaveRequests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get today approved leaves",
      error: error.message,
    });
  }
};

// @desc    Get single leave request
// @route   GET /api/leaves/:id
// @access  Private
const getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate(
        "employee",
        "name email role department position presenceStatus lastSeenAt"
      )
      .populate("reviewedBy", "name email role");

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    const isOwner =
      leaveRequest.employee._id.toString() === req.user._id.toString();

    const canViewAll =
      req.user.role === "admin" || req.user.role === "manager";

    if (!isOwner && !canViewAll) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this leave request",
      });
    }

    res.status(200).json({
      success: true,
      leaveRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get leave request",
      error: error.message,
    });
  }
};

// @desc    Approve leave request
// @route   PATCH /api/leaves/:id/approve
// @access  Admin
const approveLeaveRequest = async (req, res) => {
  try {
    const { adminComment } = req.body;

    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Only pending leave requests can be approved. Current status: ${leaveRequest.status}`,
      });
    }

    leaveRequest.status = "approved";
    leaveRequest.adminComment = adminComment || "";
    leaveRequest.reviewedBy = req.user._id;
    leaveRequest.reviewedAt = new Date();

    await leaveRequest.save();

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate(
        "employee",
        "name email role department position presenceStatus lastSeenAt"
      )
      .populate("reviewedBy", "name email role");

    const employeeNotification = await createNotification({
      type: "leave_approved",
      title: "Leave Approved",
      message: "Your leave request has been approved",
      targetUser: leaveRequest.employee,
      relatedUser: leaveRequest.employee,
      relatedLeaveRequest: leaveRequest._id,
      metadata: {
        adminComment: leaveRequest.adminComment,
      },
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`user:${leaveRequest.employee.toString()}`).emit("leave:approved", {
        type: "LEAVE_APPROVED",
        message: "Your leave request has been approved",
        leaveRequest: populatedRequest,
        time: new Date(),
      });

      io.to("admins").emit("leave:updated", {
        type: "LEAVE_APPROVED",
        message: `${populatedRequest.employee.name}'s leave request approved`,
        leaveRequest: populatedRequest,
        time: new Date(),
      });

      emitNotification(io, employeeNotification);
    }

    res.status(200).json({
      success: true,
      message: "Leave request approved successfully",
      leaveRequest: populatedRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to approve leave request",
      error: error.message,
    });
  }
};

// @desc    Reject leave request
// @route   PATCH /api/leaves/:id/reject
// @access  Admin
const rejectLeaveRequest = async (req, res) => {
  try {
    const { adminComment } = req.body;

    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Only pending leave requests can be rejected. Current status: ${leaveRequest.status}`,
      });
    }

    leaveRequest.status = "rejected";
    leaveRequest.adminComment = adminComment || "";
    leaveRequest.reviewedBy = req.user._id;
    leaveRequest.reviewedAt = new Date();

    await leaveRequest.save();

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate(
        "employee",
        "name email role department position presenceStatus lastSeenAt"
      )
      .populate("reviewedBy", "name email role");

    const employeeNotification = await createNotification({
      type: "leave_rejected",
      title: "Leave Rejected",
      message: "Your leave request has been rejected",
      targetUser: leaveRequest.employee,
      relatedUser: leaveRequest.employee,
      relatedLeaveRequest: leaveRequest._id,
      metadata: {
        adminComment: leaveRequest.adminComment,
      },
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`user:${leaveRequest.employee.toString()}`).emit("leave:rejected", {
        type: "LEAVE_REJECTED",
        message: "Your leave request has been rejected",
        leaveRequest: populatedRequest,
        time: new Date(),
      });

      io.to("admins").emit("leave:updated", {
        type: "LEAVE_REJECTED",
        message: `${populatedRequest.employee.name}'s leave request rejected`,
        leaveRequest: populatedRequest,
        time: new Date(),
      });

      emitNotification(io, employeeNotification);
    }

    res.status(200).json({
      success: true,
      message: "Leave request rejected successfully",
      leaveRequest: populatedRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reject leave request",
      error: error.message,
    });
  }
};

// @desc    Cancel my pending leave request
// @route   PATCH /api/leaves/:id/cancel
// @access  Employee / Manager
const cancelMyLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    if (leaveRequest.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can cancel only your own leave requests",
      });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending leave requests can be cancelled",
      });
    }

    leaveRequest.status = "cancelled";
    await leaveRequest.save();

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate(
        "employee",
        "name email role department position presenceStatus lastSeenAt"
      )
      .populate("reviewedBy", "name email role");

    const message = `${req.user.name} cancelled a leave request`;

    const notification = await createNotification({
      type: "leave_cancelled",
      title: "Leave Request Cancelled",
      message,
      targetRoles: ["admin", "manager"],
      relatedUser: req.user._id,
      relatedLeaveRequest: leaveRequest._id,
    });

    const io = req.app.get("io");

    if (io) {
      io.to("admins").emit("leave:cancelled", {
        type: "LEAVE_CANCELLED",
        message,
        leaveRequest: populatedRequest,
        time: new Date(),
      });

      emitNotification(io, notification);
    }

    res.status(200).json({
      success: true,
      message: "Leave request cancelled successfully",
      leaveRequest: populatedRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel leave request",
      error: error.message,
    });
  }
};

module.exports = {
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
};