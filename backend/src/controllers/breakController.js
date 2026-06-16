const {
  BREAK_RULES,
  startBreak,
  endBreak,
  getMyTodayBreaks,
  getTodayAllBreaks,
} = require("../services/breakService");

const { formatSecondsToTime } = require("../utils/dateHelper");

const {
  createNotification,
  emitNotification,
} = require("../services/notificationService");

const sanitizeUser = (user) => {
  if (!user) return null;

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    position: user.position,
    accountStatus: user.accountStatus,
    presenceStatus: user.presenceStatus,
    lastSeenAt: user.lastSeenAt,
  };
};

// @desc    Get break rules
// @route   GET /api/breaks/rules
// @access  Private
const getBreakRules = async (req, res) => {
  res.status(200).json({
    success: true,
    rules: BREAK_RULES,
  });
};

// @desc    Start break
// @route   POST /api/breaks/start
// @access  Employee / Manager
const startMyBreak = async (req, res) => {
  try {
    const { breakType } = req.body;

    if (!breakType) {
      return res.status(400).json({
        success: false,
        message: "Break type is required",
      });
    }

    const result = await startBreak({
      employeeId: req.user._id,
      breakType,
      now: new Date(),
    });

    const io = req.app.get("io");

    if (io) {
      io.to("admins").emit("break:started", {
        type: "BREAK_STARTED",
        message: `${result.user.name} started ${breakType} break`,
        user: sanitizeUser(result.user),
        breakLog: result.breakLog,
        time: new Date(),
      });

      io.to("admins").emit("presence:user_updated", {
        user: sanitizeUser(result.user),
      });
    }

    res.status(200).json({
      success: true,
      message: `${breakType} break started successfully`,
      breakLog: result.breakLog,
      user: sanitizeUser(result.user),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to start break",
    });
  }
};

// @desc    End active break
// @route   POST /api/breaks/end
// @access  Employee / Manager
const endMyBreak = async (req, res) => {
  try {
    const result = await endBreak({
      employeeId: req.user._id,
      now: new Date(),
    });

    const io = req.app.get("io");

    if (io) {
      io.to("admins").emit("break:ended", {
        type: "BREAK_ENDED",
        message: `${result.user.name} ended break`,
        user: sanitizeUser(result.user),
        breakLog: result.breakLog,
        exceeded: result.breakLog.isExceeded,
        time: new Date(),
      });

      io.to("admins").emit("presence:user_updated", {
        user: sanitizeUser(result.user),
      });
    }

    if (result.breakLog.isExceeded) {
      const exceededMessage = `${result.user.name} exceeded ${
        result.breakLog.breakType
      } break by ${formatSecondsToTime(result.breakLog.exceededSeconds)}`;

      const notification = await createNotification({
        type: "break_exceeded",
        title: "Break Time Exceeded",
        message: exceededMessage,
        targetRoles: ["admin", "manager"],
        relatedUser: result.user._id,
        relatedBreakLog: result.breakLog._id,
        metadata: {
          breakType: result.breakLog.breakType,
          exceededSeconds: result.breakLog.exceededSeconds,
          usedSeconds: result.breakLog.usedSeconds,
          allowedMinutes: result.breakLog.allowedMinutes,
        },
      });

      if (io) {
        io.to("admins").emit("break:exceeded", {
          type: "BREAK_EXCEEDED",
          message: exceededMessage,
          user: sanitizeUser(result.user),
          breakLog: result.breakLog,
          time: new Date(),
        });

        emitNotification(io, notification);
      }
    }

    res.status(200).json({
      success: true,
      message: "Break ended successfully",
      breakLog: {
        ...result.breakLog.toObject(),
        usedTime: formatSecondsToTime(result.breakLog.usedSeconds),
        exceededTime: formatSecondsToTime(result.breakLog.exceededSeconds),
      },
      user: sanitizeUser(result.user),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to end break",
    });
  }
};

// @desc    Get my today breaks
// @route   GET /api/breaks/my-today
// @access  Private
const getMyBreaksToday = async (req, res) => {
  try {
    const breaks = await getMyTodayBreaks(req.user._id);

    const formattedBreaks = breaks.map((item) => ({
      ...item.toObject(),
      usedTime: formatSecondsToTime(item.usedSeconds),
      exceededTime: formatSecondsToTime(item.exceededSeconds),
    }));

    res.status(200).json({
      success: true,
      count: formattedBreaks.length,
      breaks: formattedBreaks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get my breaks",
      error: error.message,
    });
  }
};

// @desc    Get all today breaks
// @route   GET /api/breaks/today
// @access  Admin / Manager
const getTodayBreaks = async (req, res) => {
  try {
    const breaks = await getTodayAllBreaks();

    const formattedBreaks = breaks.map((item) => ({
      ...item.toObject(),
      usedTime: formatSecondsToTime(item.usedSeconds),
      exceededTime: formatSecondsToTime(item.exceededSeconds),
    }));

    res.status(200).json({
      success: true,
      count: formattedBreaks.length,
      breaks: formattedBreaks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get today breaks",
      error: error.message,
    });
  }
};

module.exports = {
  getBreakRules,
  startMyBreak,
  endMyBreak,
  getMyBreaksToday,
  getTodayBreaks,
};