const User = require("../models/User");
const DailyWorkSession = require("../models/DailyWorkSession");
const BreakLog = require("../models/BreakLog");

const {
  getSriLankaDateString,
  getDurationInSeconds,
} = require("../utils/dateHelper");

const { getBreakRulesFromSettings } = require("./settingsService");

const throwError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const getBreakRules = async () => {
  return await getBreakRulesFromSettings();
};

const getBreakRule = async (breakType) => {
  const rules = await getBreakRulesFromSettings();
  return rules[breakType] || null;
};

const startBreak = async ({ employeeId, breakType, now = new Date() }) => {
  const today = getSriLankaDateString(now);

  const rule = await getBreakRule(breakType);

  if (!rule) {
    throwError("Invalid break type", 400);
  }

  if (!rule.enabled) {
    throwError("This break type is disabled by admin", 400);
  }

  const dailySession = await DailyWorkSession.findOne({
    employee: employeeId,
    date: today,
  });

  if (!dailySession) {
    throwError("You are not online today. Please connect first.", 400);
  }

  if (
    dailySession.currentStatus === "offline" ||
    dailySession.currentStatus === "not_started" ||
    dailySession.currentStatus === "completed"
  ) {
    throwError("You must be online to start a break", 400);
  }

  const openBreak = await BreakLog.findOne({
    employee: employeeId,
    date: today,
    isOpen: true,
  });

  if (openBreak) {
    throwError("You already have an active break", 400);
  }

  const breakLog = await BreakLog.create({
    employee: employeeId,
    dailySession: dailySession._id,
    date: today,
    breakType,
    allowedMinutes: rule.allowedMinutes,
    startTime: now,
    isOpen: true,
  });

  dailySession.currentStatus = "on_break";
  await dailySession.save();

  const user = await User.findByIdAndUpdate(
    employeeId,
    {
      presenceStatus: "on_break",
      lastSeenAt: now,
    },
    { new: true }
  ).select("-password");

  return {
    user,
    dailySession,
    breakLog,
  };
};

const endBreak = async ({ employeeId, now = new Date() }) => {
  const today = getSriLankaDateString(now);

  const breakLog = await BreakLog.findOne({
    employee: employeeId,
    date: today,
    isOpen: true,
  });

  if (!breakLog) {
    throwError("No active break found", 404);
  }

  const usedSeconds = getDurationInSeconds(breakLog.startTime, now);
  const allowedSeconds = breakLog.allowedMinutes * 60;
  const exceededSeconds = Math.max(0, usedSeconds - allowedSeconds);

  breakLog.endTime = now;
  breakLog.usedSeconds = usedSeconds;
  breakLog.exceededSeconds = exceededSeconds;
  breakLog.isExceeded = exceededSeconds > 0;
  breakLog.isOpen = false;

  await breakLog.save();

  const dailySession =
    (await DailyWorkSession.findById(breakLog.dailySession)) ||
    (await DailyWorkSession.findOne({
      employee: employeeId,
      date: today,
    }));

  if (dailySession) {
    dailySession.totalBreakSeconds =
      (dailySession.totalBreakSeconds || 0) + usedSeconds;

    dailySession.totalActiveSeconds = Math.max(
      0,
      (dailySession.totalOnlineSeconds || 0) -
        (dailySession.totalBreakSeconds || 0) -
        (dailySession.totalIdleSeconds || 0)
    );

    dailySession.currentStatus = "online";
    dailySession.lastSeenAt = now;

    await dailySession.save();
  }

  const user = await User.findByIdAndUpdate(
    employeeId,
    {
      presenceStatus: "online",
      lastSeenAt: now,
    },
    { new: true }
  ).select("-password");

  return {
    user,
    dailySession,
    breakLog,
  };
};

const getMyTodayBreaks = async (employeeId) => {
  const today = getSriLankaDateString();

  return await BreakLog.find({
    employee: employeeId,
    date: today,
  }).sort({ createdAt: -1 });
};

const getTodayAllBreaks = async () => {
  const today = getSriLankaDateString();

  return await BreakLog.find({
    date: today,
  })
    .populate("employee", "name email role department position presenceStatus")
    .sort({ createdAt: -1 });
};

module.exports = {
  getBreakRules,
  startBreak,
  endBreak,
  getMyTodayBreaks,
  getTodayAllBreaks,
};