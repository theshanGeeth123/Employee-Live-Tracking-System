const User = require("../models/User");
const DailyWorkSession = require("../models/DailyWorkSession");
const BreakLog = require("../models/BreakLog");

const {
  getSriLankaDateString,
  getDurationInSeconds,
} = require("../utils/dateHelper");

const BREAK_RULES = {
  breakfast: {
    label: "Breakfast",
    allowedMinutes: 30,
  },
  lunch: {
    label: "Lunch",
    allowedMinutes: 60,
  },
  tea: {
    label: "Tea",
    allowedMinutes: 15,
  },
};

const getBreakRule = (breakType) => {
  return BREAK_RULES[breakType] || null;
};

const startBreak = async ({ employeeId, breakType, now = new Date() }) => {
  const rule = getBreakRule(breakType);

  if (!rule) {
    const error = new Error("Invalid break type");
    error.statusCode = 400;
    throw error;
  }

  const date = getSriLankaDateString(now);

  const dailySession = await DailyWorkSession.findOne({
    employee: employeeId,
    date,
  });

  if (!dailySession) {
    const error = new Error("No work session found for today. Please connect first.");
    error.statusCode = 400;
    throw error;
  }

  if (dailySession.currentStatus === "offline") {
    const error = new Error("You are offline. Cannot start a break.");
    error.statusCode = 400;
    throw error;
  }

  if (dailySession.currentStatus === "on_break") {
    const error = new Error("You are already on a break.");
    error.statusCode = 400;
    throw error;
  }

  const existingOpenBreak = await BreakLog.findOne({
    employee: employeeId,
    date,
    isOpen: true,
  });

  if (existingOpenBreak) {
    const error = new Error("You already have an active break.");
    error.statusCode = 400;
    throw error;
  }

  const breakLog = await BreakLog.create({
    employee: employeeId,
    dailySession: dailySession._id,
    date,
    breakType,
    allowedMinutes: rule.allowedMinutes,
    startTime: now,
    isOpen: true,
  });

  dailySession.currentStatus = "on_break";
  dailySession.lastSeenAt = now;

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
    breakLog,
    dailySession,
    user,
    rule,
  };
};

const endBreak = async ({ employeeId, now = new Date() }) => {
  const date = getSriLankaDateString(now);

  const openBreak = await BreakLog.findOne({
    employee: employeeId,
    date,
    isOpen: true,
  }).sort({ startTime: -1 });

  if (!openBreak) {
    const error = new Error("No active break found.");
    error.statusCode = 400;
    throw error;
  }

  const usedSeconds = getDurationInSeconds(openBreak.startTime, now);
  const allowedSeconds = openBreak.allowedMinutes * 60;
  const exceededSeconds = Math.max(0, usedSeconds - allowedSeconds);

  openBreak.endTime = now;
  openBreak.usedSeconds = usedSeconds;
  openBreak.exceededSeconds = exceededSeconds;
  openBreak.isExceeded = exceededSeconds > 0;
  openBreak.isOpen = false;

  await openBreak.save();

  const dailySession = await DailyWorkSession.findById(openBreak.dailySession);

  if (dailySession) {
    dailySession.totalBreakSeconds += usedSeconds;

    dailySession.totalActiveSeconds =
      dailySession.totalOnlineSeconds -
      dailySession.totalBreakSeconds -
      dailySession.totalIdleSeconds;

    if (dailySession.totalActiveSeconds < 0) {
      dailySession.totalActiveSeconds = 0;
    }

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
    breakLog: openBreak,
    dailySession,
    user,
  };
};

const getMyTodayBreaks = async (employeeId) => {
  const today = getSriLankaDateString();

  return await BreakLog.find({
    employee: employeeId,
    date: today,
  }).sort({ startTime: 1 });
};

const getTodayAllBreaks = async () => {
  const today = getSriLankaDateString();

  return await BreakLog.find({ date: today })
    .populate("employee", "name email role department position presenceStatus")
    .sort({ startTime: 1 });
};

module.exports = {
  BREAK_RULES,
  startBreak,
  endBreak,
  getMyTodayBreaks,
  getTodayAllBreaks,
};