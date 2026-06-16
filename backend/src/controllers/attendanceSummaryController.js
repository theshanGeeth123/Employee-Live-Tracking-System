const User = require("../models/User");
const DailyWorkSession = require("../models/DailyWorkSession");
const SessionLog = require("../models/SessionLog");
const BreakLog = require("../models/BreakLog");
const LeaveRequest = require("../models/LeaveRequest");

const {
  getSriLankaDateString,
  getDurationInSeconds,
  formatSecondsToTime,
} = require("../utils/dateHelper");

const getLiveSessionSeconds = async (session, now) => {
  if (!session) {
    return {
      totalOnlineSeconds: 0,
      totalActiveSeconds: 0,
    };
  }

  let liveOnlineSeconds = session.totalOnlineSeconds || 0;

  const openLog = await SessionLog.findOne({
    employee: session.employee,
    date: session.date,
    isOpen: true,
  }).sort({ startTime: -1 });

  if (openLog) {
    liveOnlineSeconds += getDurationInSeconds(openLog.startTime, now);
  }

  let liveActiveSeconds =
    liveOnlineSeconds -
    (session.totalBreakSeconds || 0) -
    (session.totalIdleSeconds || 0);

  if (liveActiveSeconds < 0) {
    liveActiveSeconds = 0;
  }

  return {
    totalOnlineSeconds: liveOnlineSeconds,
    totalActiveSeconds: liveActiveSeconds,
  };
};

const getDisplayStatus = ({
  user,
  session,
  approvedLeave,
  openBreak,
  pendingLeave,
}) => {
  if (approvedLeave) {
    return {
      status: "on_approved_leave",
      label: "On Approved Leave",
    };
  }

  if (openBreak || session?.currentStatus === "on_break") {
    return {
      status: "on_break",
      label: "On Break",
    };
  }

  if (user.presenceStatus === "online") {
    return {
      status: "online",
      label: "Online",
    };
  }

  if (user.presenceStatus === "idle") {
    return {
      status: "idle",
      label: "Idle",
    };
  }

  if (session) {
    return {
      status: "offline",
      label: "Offline",
    };
  }

  if (pendingLeave) {
    return {
      status: "leave_pending_not_logged",
      label: "Leave Pending - Not Logged In",
    };
  }

  return {
    status: "absent",
    label: "Absent / Not Logged In",
  };
};

// @desc    Get today's full attendance summary
// @route   GET /api/attendance-summary/today
// @access  Admin / Manager
const getTodayAttendanceSummary = async (req, res) => {
  try {
    const today = getSriLankaDateString();
    const now = new Date();

    const employees = await User.find({
      role: { $in: ["employee", "manager"] },
      accountStatus: "active",
    })
      .select(
        "name email role phone department position accountStatus presenceStatus lastSeenAt lastLoginAt"
      )
      .sort({ name: 1 });

    const employeeIds = employees.map((employee) => employee._id);

    const sessions = await DailyWorkSession.find({
      employee: { $in: employeeIds },
      date: today,
    });

    const approvedLeaves = await LeaveRequest.find({
      employee: { $in: employeeIds },
      status: "approved",
      startDate: { $lte: today },
      endDate: { $gte: today },
    }).populate("reviewedBy", "name email role");

    const pendingLeaves = await LeaveRequest.find({
      employee: { $in: employeeIds },
      status: "pending",
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    const openBreaks = await BreakLog.find({
      employee: { $in: employeeIds },
      date: today,
      isOpen: true,
    });

    const sessionMap = new Map();
    sessions.forEach((session) => {
      sessionMap.set(session.employee.toString(), session);
    });

    const approvedLeaveMap = new Map();
    approvedLeaves.forEach((leave) => {
      approvedLeaveMap.set(leave.employee.toString(), leave);
    });

    const pendingLeaveMap = new Map();
    pendingLeaves.forEach((leave) => {
      pendingLeaveMap.set(leave.employee.toString(), leave);
    });

    const openBreakMap = new Map();
    openBreaks.forEach((breakLog) => {
      openBreakMap.set(breakLog.employee.toString(), breakLog);
    });

    const rows = [];

    const summary = {
      totalEmployees: employees.length,
      online: 0,
      offline: 0,
      onBreak: 0,
      idle: 0,
      approvedLeave: 0,
      absent: 0,
      pendingLeaveToday: pendingLeaves.length,
    };

    for (const employee of employees) {
      const employeeId = employee._id.toString();

      const session = sessionMap.get(employeeId) || null;
      const approvedLeave = approvedLeaveMap.get(employeeId) || null;
      const pendingLeave = pendingLeaveMap.get(employeeId) || null;
      const openBreak = openBreakMap.get(employeeId) || null;

      const liveSeconds = await getLiveSessionSeconds(session, now);

      const displayStatus = getDisplayStatus({
        user: employee,
        session,
        approvedLeave,
        openBreak,
        pendingLeave,
      });

      if (displayStatus.status === "online") summary.online += 1;
      else if (displayStatus.status === "offline") summary.offline += 1;
      else if (displayStatus.status === "on_break") summary.onBreak += 1;
      else if (displayStatus.status === "idle") summary.idle += 1;
      else if (displayStatus.status === "on_approved_leave")
        summary.approvedLeave += 1;
      else summary.absent += 1;

      let currentBreak = null;

      if (openBreak) {
        const usedSeconds = getDurationInSeconds(openBreak.startTime, now);
        const allowedSeconds = openBreak.allowedMinutes * 60;
        const remainingSeconds = Math.max(0, allowedSeconds - usedSeconds);
        const exceededSeconds = Math.max(0, usedSeconds - allowedSeconds);

        currentBreak = {
          id: openBreak._id,
          breakType: openBreak.breakType,
          allowedMinutes: openBreak.allowedMinutes,
          startTime: openBreak.startTime,
          usedSeconds,
          usedTime: formatSecondsToTime(usedSeconds),
          remainingSeconds,
          remainingTime: formatSecondsToTime(remainingSeconds),
          exceededSeconds,
          exceededTime: formatSecondsToTime(exceededSeconds),
          isExceeded: exceededSeconds > 0,
        };
      }

      rows.push({
        employee: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          phone: employee.phone,
          department: employee.department,
          position: employee.position,
          accountStatus: employee.accountStatus,
          presenceStatus: employee.presenceStatus,
          lastSeenAt: employee.lastSeenAt,
          lastLoginAt: employee.lastLoginAt,
        },

        date: today,

        status: displayStatus.status,
        statusLabel: displayStatus.label,

        firstLoginAt: session?.firstLoginAt || null,
        lastSeenAt: session?.lastSeenAt || employee.lastSeenAt || null,

        totalOnlineSeconds: liveSeconds.totalOnlineSeconds,
        totalOnlineTime: formatSecondsToTime(liveSeconds.totalOnlineSeconds),

        totalActiveSeconds: liveSeconds.totalActiveSeconds,
        totalActiveTime: formatSecondsToTime(liveSeconds.totalActiveSeconds),

        totalBreakSeconds: session?.totalBreakSeconds || 0,
        totalBreakTime: formatSecondsToTime(session?.totalBreakSeconds || 0),

        totalIdleSeconds: session?.totalIdleSeconds || 0,
        totalIdleTime: formatSecondsToTime(session?.totalIdleSeconds || 0),

        currentBreak,

        approvedLeave: approvedLeave
          ? {
              id: approvedLeave._id,
              leaveType: approvedLeave.leaveType,
              startDate: approvedLeave.startDate,
              endDate: approvedLeave.endDate,
              numberOfDays: approvedLeave.numberOfDays,
              reason: approvedLeave.reason,
              status: approvedLeave.status,
              adminComment: approvedLeave.adminComment,
              reviewedBy: approvedLeave.reviewedBy,
              reviewedAt: approvedLeave.reviewedAt,
            }
          : null,

        pendingLeave: pendingLeave
          ? {
              id: pendingLeave._id,
              leaveType: pendingLeave.leaveType,
              startDate: pendingLeave.startDate,
              endDate: pendingLeave.endDate,
              numberOfDays: pendingLeave.numberOfDays,
              reason: pendingLeave.reason,
              status: pendingLeave.status,
            }
          : null,
      });
    }

    res.status(200).json({
      success: true,
      date: today,
      generatedAt: now,
      summary,
      count: rows.length,
      employees: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get today's attendance summary",
      error: error.message,
    });
  }
};

module.exports = {
  getTodayAttendanceSummary,
};