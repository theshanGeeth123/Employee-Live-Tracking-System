const User = require("../models/User");
const DailyWorkSession = require("../models/DailyWorkSession");
const AttendanceSetting = require("../models/AttendanceSetting");

const SL_OFFSET_MINUTES = 330;
const SL_OFFSET_MS = SL_OFFSET_MINUTES * 60 * 1000;

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const getIdString = (value) => {
  if (!value) return "";
  return String(value._id || value.id || value);
};

const getUserName = (user) => {
  if (!user) return "Unknown";

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    user.name ||
    user.fullName ||
    user.username ||
    fullName ||
    user.email ||
    "Unknown"
  );
};

const toSriLankaDateKey = (dateValue) => {
  if (!dateValue) return null;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return null;

  return new Date(date.getTime() + SL_OFFSET_MS).toISOString().slice(0, 10);
};

const getSriLankaDateRange = (dateKey) => {
  const start = new Date(`${dateKey}T00:00:00.000+05:30`);
  const end = new Date(`${dateKey}T23:59:59.999+05:30`);

  return { start, end };
};

const getDateObjectFromDateKey = (dateKey) => {
  return new Date(`${dateKey}T12:00:00.000+05:30`);
};

const addDaysToDateKey = (dateKey, days) => {
  const date = getDateObjectFromDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toSriLankaDateKey(date);
};

const getDateKeysBetween = (startKey, endKey) => {
  const keys = [];
  let current = startKey;

  while (current <= endKey) {
    keys.push(current);
    current = addDaysToDateKey(current, 1);
  }

  return keys;
};

const getReportRange = (type, dateKey) => {
  const safeType = ["daily", "weekly", "monthly"].includes(type)
    ? type
    : "daily";

  const selectedDate = getDateObjectFromDateKey(dateKey);
  const selectedKey = toSriLankaDateKey(selectedDate);

  if (safeType === "daily") {
    return {
      type: safeType,
      startKey: selectedKey,
      endKey: selectedKey,
    };
  }

  if (safeType === "weekly") {
    const day = selectedDate.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(selectedDate);
    monday.setUTCDate(selectedDate.getUTCDate() + mondayOffset);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    return {
      type: safeType,
      startKey: toSriLankaDateKey(monday),
      endKey: toSriLankaDateKey(sunday),
    };
  }

  const year = selectedDate.getUTCFullYear();
  const month = selectedDate.getUTCMonth();

  const firstDay = new Date(Date.UTC(year, month, 1, 6, 30, 0));
  const lastDay = new Date(Date.UTC(year, month + 1, 0, 6, 30, 0));

  return {
    type: safeType,
    startKey: toSriLankaDateKey(firstDay),
    endKey: toSriLankaDateKey(lastDay),
  };
};

const normalizeTime = (value) => {
  if (!value) return "";

  return String(value).trim().replace(".", ":");
};

const timeToMinutes = (value) => {
  const normalized = normalizeTime(value);

  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const safeMinutes = Number(minutes || 0);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const getScheduleSeconds = (workStartTime, workEndTime) => {
  const startMinutes = timeToMinutes(workStartTime);
  const endMinutes = timeToMinutes(workEndTime);

  if (startMinutes === null || endMinutes === null) return 0;

  let durationMinutes = endMinutes - startMinutes;

  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }

  return durationMinutes * 60;
};

const makeDateTimeOnDateKey = (dateKey, timeValue) => {
  const normalized = normalizeTime(timeValue);
  return new Date(`${dateKey}T${normalized}:00.000+05:30`);
};

const getDateFromPossibleValues = (...values) => {
  for (const value of values) {
    if (!value) continue;

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

const getNumberFromPossibleValues = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;

    const number = Number(value);

    if (!Number.isNaN(number)) {
      return number;
    }
  }

  return 0;
};

const normalizeDurationSeconds = (...values) => {
  const value = getNumberFromPossibleValues(...values);

  if (!value || value < 0) return 0;

  return Math.round(value);
};

const getSessionUserId = (session) => {
  return getIdString(
    session.user ||
      session.employee ||
      session.employeeId ||
      session.userId ||
      session.createdBy
  );
};

const getSessionDateKey = (session) => {
  if (typeof session.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
    return session.date;
  }

  if (
    typeof session.sessionDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(session.sessionDate)
  ) {
    return session.sessionDate;
  }

  return (
    toSriLankaDateKey(session.date) ||
    toSriLankaDateKey(session.sessionDate) ||
    toSriLankaDateKey(session.firstLogin) ||
    toSriLankaDateKey(session.loginAt) ||
    toSriLankaDateKey(session.startTime) ||
    toSriLankaDateKey(session.createdAt)
  );
};

const getSessionFirstLogin = (session) => {
  return getDateFromPossibleValues(
    session.firstLogin,
    session.loginAt,
    session.clockIn,
    session.startTime,
    session.onlineStart,
    session.createdAt
  );
};

const getSessionLastSeen = (session) => {
  return getDateFromPossibleValues(
    session.lastSeen,
    session.lastActive,
    session.logoutAt,
    session.checkoutAt,
    session.endTime,
    session.updatedAt
  );
};

const getSessionBreakSeconds = (session) => {
  return normalizeDurationSeconds(
    session.breakTime,
    session.totalBreakTime,
    session.breakDuration,
    session.breakSeconds
  );
};

const getSessionActiveSeconds = (session) => {
  return normalizeDurationSeconds(
    session.activeTime,
    session.totalActiveTime,
    session.activeDuration,
    session.workTime,
    session.workSeconds
  );
};

const getSessionOnlineSeconds = (session, firstLogin, lastSeen) => {
  const storedOnlineSeconds = normalizeDurationSeconds(
    session.onlineTime,
    session.totalOnlineTime,
    session.onlineDuration,
    session.totalDuration
  );

  if (storedOnlineSeconds > 0) return storedOnlineSeconds;

  if (firstLogin && lastSeen) {
    return Math.max(0, Math.round((lastSeen.getTime() - firstLogin.getTime()) / 1000));
  }

  return 0;
};

const getOverlapSeconds = (startA, endA, startB, endB) => {
  if (!startA || !endA || !startB || !endB) return 0;

  const start = Math.max(startA.getTime(), startB.getTime());
  const end = Math.min(endA.getTime(), endB.getTime());

  return Math.max(0, Math.round((end - start) / 1000));
};

const formatSeconds = (seconds) => {
  const safeSeconds = Math.max(0, Math.round(seconds || 0));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  return `${hours}h ${minutes}m ${secs}s`;
};

const getOrCreateAttendanceSetting = async () => {
  let setting = await AttendanceSetting.findOne().sort({ createdAt: 1 });

  if (!setting) {
    setting = await AttendanceSetting.create({
      workStartTime: "08:30",
      workEndTime: "17:30",
      graceMinutes: 15,
      workingDays: [1, 2, 3, 4, 5],
    });
  }

  return setting;
};

const getUserFilter = ({ search, role }) => {
  const filter = {
    role: { $in: ["employee", "manager"] },
  };

  if (role && role !== "all") {
    filter.role = role;
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), "i");

    filter.$or = [
      { name: regex },
      { fullName: regex },
      { firstName: regex },
      { lastName: regex },
      { username: regex },
      { email: regex },
      { role: regex },
    ];
  }

  return filter;
};

const buildSessionQuery = ({ userIds, start, end, dateKeys }) => {
  return {
    $and: [
      {
        $or: [
          { user: { $in: userIds } },
          { employee: { $in: userIds } },
          { employeeId: { $in: userIds } },
          { userId: { $in: userIds } },
        ],
      },
      {
        $or: [
          { date: { $gte: start, $lte: end } },
          { sessionDate: { $gte: start, $lte: end } },
          { date: { $in: dateKeys } },
          { sessionDate: { $in: dateKeys } },
          { firstLogin: { $gte: start, $lte: end } },
          { loginAt: { $gte: start, $lte: end } },
          { startTime: { $gte: start, $lte: end } },
          { createdAt: { $gte: start, $lte: end } },
        ],
      },
    ],
  };
};

exports.getAttendanceSettings = async (req, res) => {
  try {
    const setting = await getOrCreateAttendanceSetting();

    return res.status(200).json({
      success: true,
      settings: {
        workStartTime: setting.workStartTime,
        workEndTime: setting.workEndTime,
        graceMinutes: setting.graceMinutes,
        workingDays: setting.workingDays,
      },
    });
  } catch (error) {
    console.error("Get attendance settings error:", error);
    return sendError(res, 500, "Failed to load attendance settings");
  }
};

exports.updateAttendanceSettings = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return sendError(res, 403, "Only admin can update attendance settings");
    }

    const { workStartTime, workEndTime, graceMinutes } = req.body;

    const startMinutes = timeToMinutes(workStartTime);
    const endMinutes = timeToMinutes(workEndTime);

    if (startMinutes === null) {
      return sendError(res, 400, "Invalid work start time");
    }

    if (endMinutes === null) {
      return sendError(res, 400, "Invalid work end time");
    }

    const setting = await getOrCreateAttendanceSetting();

    setting.workStartTime = minutesToTime(startMinutes);
    setting.workEndTime = minutesToTime(endMinutes);
    setting.graceMinutes = Number(graceMinutes || 0);

    await setting.save();

    return res.status(200).json({
      success: true,
      message: "Attendance working time updated successfully",
      settings: {
        workStartTime: setting.workStartTime,
        workEndTime: setting.workEndTime,
        graceMinutes: setting.graceMinutes,
        workingDays: setting.workingDays,
      },
    });
  } catch (error) {
    console.error("Update attendance settings error:", error);
    return sendError(res, 500, "Failed to update attendance settings");
  }
};

exports.getAdvancedAttendanceReport = async (req, res) => {
  try {
    const {
      type = "daily",
      date,
      search = "",
      role = "all",
    } = req.query;

    const selectedDateKey = date || toSriLankaDateKey(new Date());
    const range = getReportRange(type, selectedDateKey);
    const dateKeys = getDateKeysBetween(range.startKey, range.endKey);

    const { start } = getSriLankaDateRange(range.startKey);
    const { end } = getSriLankaDateRange(range.endKey);

    const setting = await getOrCreateAttendanceSetting();
    const scheduleSecondsPerDay = getScheduleSeconds(
      setting.workStartTime,
      setting.workEndTime
    );

    const userFilter = getUserFilter({ search, role });

    const users = await User.find(userFilter)
      .select("name fullName firstName lastName username email role department position status isActive")
      .sort({ role: 1, name: 1, email: 1 });

    const userIds = users.map((user) => user._id);

    const sessions = userIds.length
      ? await DailyWorkSession.find(
          buildSessionQuery({
            userIds,
            start,
            end,
            dateKeys,
          })
        ).lean()
      : [];

    const sessionsByUser = new Map();

    for (const session of sessions) {
      const userId = getSessionUserId(session);

      if (!userId) continue;

      if (!sessionsByUser.has(userId)) {
        sessionsByUser.set(userId, []);
      }

      sessionsByUser.get(userId).push(session);
    }

    const workingDateKeys = dateKeys.filter((dateKey) => {
      const day = getDateObjectFromDateKey(dateKey).getUTCDay();
      return setting.workingDays.includes(day);
    });

    const rows = users.map((user) => {
      const userId = getIdString(user._id);
      const userSessions = sessionsByUser.get(userId) || [];

      let firstLogin = null;
      let lastSeen = null;
      let activeSeconds = 0;
      let onlineSeconds = 0;
      let breakSeconds = 0;
      let scheduledWorkSeconds = 0;
      let lateDays = 0;
      let earlyCheckoutDays = 0;

      const sessionDetails = userSessions.map((session) => {
        const dateKey = getSessionDateKey(session);
        const sessionFirstLogin = getSessionFirstLogin(session);
        const sessionLastSeen = getSessionLastSeen(session);

        const sessionBreakSeconds = getSessionBreakSeconds(session);
        const sessionActiveSeconds = getSessionActiveSeconds(session);
        const sessionOnlineSeconds = getSessionOnlineSeconds(
          session,
          sessionFirstLogin,
          sessionLastSeen
        );

        const scheduleStart = makeDateTimeOnDateKey(
          dateKey,
          setting.workStartTime
        );
        const scheduleEnd = makeDateTimeOnDateKey(dateKey, setting.workEndTime);

        const overlapSeconds = getOverlapSeconds(
          sessionFirstLogin,
          sessionLastSeen,
          scheduleStart,
          scheduleEnd
        );

        const day = dateKey ? getDateObjectFromDateKey(dateKey).getUTCDay() : null;
        const isWorkingDay = setting.workingDays.includes(day);
        const expectedSeconds = isWorkingDay ? scheduleSecondsPerDay : 0;

        const graceLimit = new Date(
          scheduleStart.getTime() + Number(setting.graceMinutes || 0) * 60 * 1000
        );

        const isLate =
          isWorkingDay &&
          sessionFirstLogin &&
          sessionFirstLogin.getTime() > graceLimit.getTime();

        const isEarly =
          isWorkingDay &&
          sessionLastSeen &&
          sessionLastSeen.getTime() < scheduleEnd.getTime();

        if (isLate) lateDays += 1;
        if (isEarly) earlyCheckoutDays += 1;

        if (!firstLogin || (sessionFirstLogin && sessionFirstLogin < firstLogin)) {
          firstLogin = sessionFirstLogin;
        }

        if (!lastSeen || (sessionLastSeen && sessionLastSeen > lastSeen)) {
          lastSeen = sessionLastSeen;
        }

        activeSeconds += sessionActiveSeconds;
        onlineSeconds += sessionOnlineSeconds;
        breakSeconds += sessionBreakSeconds;
        scheduledWorkSeconds += Math.max(
          0,
          overlapSeconds - sessionBreakSeconds
        );

        return {
          _id: session._id,
          date: dateKey,
          firstLogin: sessionFirstLogin,
          lastSeen: sessionLastSeen,
          activeSeconds: sessionActiveSeconds,
          onlineSeconds: sessionOnlineSeconds,
          breakSeconds: sessionBreakSeconds,
          scheduledWorkSeconds: Math.max(0, overlapSeconds - sessionBreakSeconds),
          expectedSeconds,
          isLate,
          isEarly,
          activeTime: formatSeconds(sessionActiveSeconds),
          onlineTime: formatSeconds(sessionOnlineSeconds),
          breakTime: formatSeconds(sessionBreakSeconds),
          scheduledWorkTime: formatSeconds(
            Math.max(0, overlapSeconds - sessionBreakSeconds)
          ),
        };
      });

      const presentDateKeys = new Set(
        sessionDetails.map((item) => item.date).filter(Boolean)
      );

      const expectedDays = workingDateKeys.length;
      const presentDays = [...presentDateKeys].filter((dateKey) =>
        workingDateKeys.includes(dateKey)
      ).length;

      const absentDays = Math.max(0, expectedDays - presentDays);
      const expectedSeconds = expectedDays * scheduleSecondsPerDay;

      const calculatedWorkSeconds =
        activeSeconds > 0 ? activeSeconds : Math.max(0, onlineSeconds - breakSeconds);

      const actualWorkSeconds =
        scheduledWorkSeconds > 0 ? scheduledWorkSeconds : calculatedWorkSeconds;

      const overtimeSeconds = Math.max(0, calculatedWorkSeconds - expectedSeconds);
      const shortageSeconds = Math.max(0, expectedSeconds - calculatedWorkSeconds);

      let status = "Absent";

      if (presentDays > 0) {
        status = "Present";
      }

      if (type === "daily" && sessionDetails.length > 0) {
        const hasRunningSession = sessionDetails.some((item) => !item.lastSeen);
        if (hasRunningSession) {
          status = "Online";
        }
      }

      return {
        user: {
          _id: user._id,
          name: getUserName(user),
          email: user.email || "",
          role: user.role,
          department: user.department || "",
          position: user.position || "",
        },
        status,
        firstLogin,
        lastSeen,
        expectedDays,
        presentDays,
        absentDays,
        lateDays,
        earlyCheckoutDays,
        activeSeconds,
        onlineSeconds,
        breakSeconds,
        scheduledWorkSeconds,
        expectedSeconds,
        actualWorkSeconds,
        overtimeSeconds,
        shortageSeconds,
        activeTime: formatSeconds(activeSeconds),
        onlineTime: formatSeconds(onlineSeconds),
        breakTime: formatSeconds(breakSeconds),
        scheduledWorkTime: formatSeconds(actualWorkSeconds),
        expectedTime: formatSeconds(expectedSeconds),
        overtime: formatSeconds(overtimeSeconds),
        shortage: formatSeconds(shortageSeconds),
        sessions: sessionDetails.sort((a, b) => String(a.date).localeCompare(String(b.date))),
      };
    });

    const summary = {
      totalUsers: rows.length,
      presentUsers: rows.filter((row) => row.presentDays > 0).length,
      absentUsers: rows.filter((row) => row.presentDays === 0).length,
      lateUsers: rows.filter((row) => row.lateDays > 0).length,
      earlyCheckoutUsers: rows.filter((row) => row.earlyCheckoutDays > 0).length,
      totalExpectedSeconds: rows.reduce((sum, row) => sum + row.expectedSeconds, 0),
      totalWorkSeconds: rows.reduce((sum, row) => sum + row.actualWorkSeconds, 0),
      totalBreakSeconds: rows.reduce((sum, row) => sum + row.breakSeconds, 0),
      totalOvertimeSeconds: rows.reduce((sum, row) => sum + row.overtimeSeconds, 0),
      totalShortageSeconds: rows.reduce((sum, row) => sum + row.shortageSeconds, 0),
    };

    return res.status(200).json({
      success: true,
      report: {
        type: range.type,
        selectedDate: selectedDateKey,
        startDate: range.startKey,
        endDate: range.endKey,
        dateKeys,
        workingDateKeys,
        settings: {
          workStartTime: setting.workStartTime,
          workEndTime: setting.workEndTime,
          graceMinutes: setting.graceMinutes,
          workingDays: setting.workingDays,
          scheduleSecondsPerDay,
          scheduleTimePerDay: formatSeconds(scheduleSecondsPerDay),
        },
        summary: {
          ...summary,
          totalExpectedTime: formatSeconds(summary.totalExpectedSeconds),
          totalWorkTime: formatSeconds(summary.totalWorkSeconds),
          totalBreakTime: formatSeconds(summary.totalBreakSeconds),
          totalOvertime: formatSeconds(summary.totalOvertimeSeconds),
          totalShortage: formatSeconds(summary.totalShortageSeconds),
        },
        rows,
      },
    });
  } catch (error) {
    console.error("Advanced attendance report error:", error);
    return sendError(res, 500, "Failed to generate attendance report");
  }
};