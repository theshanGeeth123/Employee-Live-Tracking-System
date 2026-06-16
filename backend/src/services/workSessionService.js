const DailyWorkSession = require("../models/DailyWorkSession");
const SessionLog = require("../models/SessionLog");

const {
  getSriLankaDateString,
  getDurationInSeconds,
} = require("../utils/dateHelper");

const getOrCreateDailySession = async (employeeId, now = new Date()) => {
  const date = getSriLankaDateString(now);

  let dailySession = await DailyWorkSession.findOne({
    employee: employeeId,
    date,
  });

  if (!dailySession) {
    dailySession = await DailyWorkSession.create({
      employee: employeeId,
      date,
      firstLoginAt: now,
      lastSeenAt: now,
      currentStatus: "online",
      activeSegmentStartedAt: now,
    });
  }

  return dailySession;
};

const startOnlineSession = async ({
  employeeId,
  reason = "socket_connect",
  now = new Date(),
}) => {
  const date = getSriLankaDateString(now);

  const dailySession = await getOrCreateDailySession(employeeId, now);

  if (!dailySession.firstLoginAt) {
    dailySession.firstLoginAt = now;
  }

  dailySession.currentStatus = "online";
  dailySession.lastSeenAt = now;

  if (!dailySession.activeSegmentStartedAt) {
    dailySession.activeSegmentStartedAt = now;
  }

  await dailySession.save();

  const existingOpenLog = await SessionLog.findOne({
    employee: employeeId,
    date,
    isOpen: true,
  });

  if (existingOpenLog) {
    return {
      dailySession,
      sessionLog: existingOpenLog,
    };
  }

  const sessionLog = await SessionLog.create({
    employee: employeeId,
    dailySession: dailySession._id,
    date,
    startTime: now,
    startReason: reason,
    isOpen: true,
  });

  return {
    dailySession,
    sessionLog,
  };
};

const closeOnlineSession = async ({
  employeeId,
  reason = "disconnect",
  now = new Date(),
}) => {
  const date = getSriLankaDateString(now);

  const dailySession = await DailyWorkSession.findOne({
    employee: employeeId,
    date,
  });

  if (!dailySession) {
    return null;
  }

  const openLog = await SessionLog.findOne({
    employee: employeeId,
    date,
    isOpen: true,
  }).sort({ startTime: -1 });

  let durationSeconds = 0;

  if (openLog) {
    durationSeconds = getDurationInSeconds(openLog.startTime, now);

    openLog.endTime = now;
    openLog.durationSeconds = durationSeconds;
    openLog.endReason = reason;
    openLog.isOpen = false;

    await openLog.save();
  }

  dailySession.totalOnlineSeconds += durationSeconds;

  // For now active time = online time.
  // Later break time and idle time will be deducted.
  dailySession.totalActiveSeconds =
    dailySession.totalOnlineSeconds -
    dailySession.totalBreakSeconds -
    dailySession.totalIdleSeconds;

  if (dailySession.totalActiveSeconds < 0) {
    dailySession.totalActiveSeconds = 0;
  }

  dailySession.currentStatus = "offline";
  dailySession.lastSeenAt = now;
  dailySession.activeSegmentStartedAt = null;

  await dailySession.save();

  return {
    dailySession,
    closedLog: openLog,
  };
};

const updateHeartbeat = async ({ employeeId, now = new Date() }) => {
  const dailySession = await getOrCreateDailySession(employeeId, now);

  dailySession.lastSeenAt = now;

  if (dailySession.currentStatus !== "on_break") {
    dailySession.currentStatus = "online";
  }

  await dailySession.save();

  return dailySession;
};

const getTodayWorkSessions = async () => {
  const today = getSriLankaDateString();

  const sessions = await DailyWorkSession.find({ date: today })
    .populate("employee", "name email role department position presenceStatus lastSeenAt")
    .sort({ firstLoginAt: 1 });

  return sessions;
};

module.exports = {
  getOrCreateDailySession,
  startOnlineSession,
  closeOnlineSession,
  updateHeartbeat,
  getTodayWorkSessions,
};