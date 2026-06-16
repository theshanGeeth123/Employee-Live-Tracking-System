const DailyWorkSession = require("../models/DailyWorkSession");
const SessionLog = require("../models/SessionLog");

const {
  getSriLankaDateString,
  formatSecondsToTime,
} = require("../utils/dateHelper");

// @desc    Get today work sessions
// @route   GET /api/work-sessions/today
// @access  Admin / Manager
const getTodaySessions = async (req, res) => {
  try {
    const today = getSriLankaDateString();

    const sessions = await DailyWorkSession.find({ date: today })
      .populate(
        "employee",
        "name email role department position presenceStatus lastSeenAt"
      )
      .sort({ firstLoginAt: 1 });

    const formattedSessions = sessions.map((session) => ({
      id: session._id,
      date: session.date,
      employee: session.employee,
      firstLoginAt: session.firstLoginAt,
      lastSeenAt: session.lastSeenAt,
      currentStatus: session.currentStatus,
      totalOnlineSeconds: session.totalOnlineSeconds,
      totalOnlineTime: formatSecondsToTime(session.totalOnlineSeconds),
      totalActiveSeconds: session.totalActiveSeconds,
      totalActiveTime: formatSecondsToTime(session.totalActiveSeconds),
      totalBreakSeconds: session.totalBreakSeconds,
      totalBreakTime: formatSecondsToTime(session.totalBreakSeconds),
      totalIdleSeconds: session.totalIdleSeconds,
      totalIdleTime: formatSecondsToTime(session.totalIdleSeconds),
    }));

    res.status(200).json({
      success: true,
      count: formattedSessions.length,
      sessions: formattedSessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get today work sessions",
      error: error.message,
    });
  }
};

// @desc    Get my today work session
// @route   GET /api/work-sessions/my-today
// @access  Private
const getMyTodaySession = async (req, res) => {
  try {
    const today = getSriLankaDateString();

    const session = await DailyWorkSession.findOne({
      employee: req.user._id,
      date: today,
    });

    if (!session) {
      return res.status(200).json({
        success: true,
        message: "No work session started today",
        session: null,
      });
    }

    res.status(200).json({
      success: true,
      session: {
        id: session._id,
        date: session.date,
        firstLoginAt: session.firstLoginAt,
        lastSeenAt: session.lastSeenAt,
        currentStatus: session.currentStatus,
        totalOnlineSeconds: session.totalOnlineSeconds,
        totalOnlineTime: formatSecondsToTime(session.totalOnlineSeconds),
        totalActiveSeconds: session.totalActiveSeconds,
        totalActiveTime: formatSecondsToTime(session.totalActiveSeconds),
        totalBreakSeconds: session.totalBreakSeconds,
        totalBreakTime: formatSecondsToTime(session.totalBreakSeconds),
        totalIdleSeconds: session.totalIdleSeconds,
        totalIdleTime: formatSecondsToTime(session.totalIdleSeconds),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get my today work session",
      error: error.message,
    });
  }
};

// @desc    Get employee session logs for today
// @route   GET /api/work-sessions/:employeeId/logs/today
// @access  Admin / Manager
const getEmployeeTodayLogs = async (req, res) => {
  try {
    const today = getSriLankaDateString();

    const logs = await SessionLog.find({
      employee: req.params.employeeId,
      date: today,
    }).sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get employee today logs",
      error: error.message,
    });
  }
};

module.exports = {
  getTodaySessions,
  getMyTodaySession,
  getEmployeeTodayLogs,
};