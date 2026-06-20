const User = require("../models/User");
const DailyWorkSession = require("../models/DailyWorkSession");
const SessionLog = require("../models/SessionLog");
const BreakLog = require("../models/BreakLog");
const LeaveRequest = require("../models/LeaveRequest");
const AttendanceSetting = require("../models/AttendanceSetting");

const {
  getSriLankaDateString,
  getDurationInSeconds,
  formatSecondsToTime,
} = require("../utils/dateHelper");

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseCalendarDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};

const formatCalendarDate = (date) => date.toISOString().slice(0, 10);

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

const getDateRange = (type, selectedDate) => {
  const baseDate = parseCalendarDate(selectedDate);

  if (type === "weekly") {
    const day = baseDate.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = addDays(baseDate, mondayOffset);
    const end = addDays(start, 6);

    return {
      startDate: formatCalendarDate(start),
      endDate: formatCalendarDate(end),
    };
  }

  if (type === "monthly") {
    const year = baseDate.getUTCFullYear();
    const month = baseDate.getUTCMonth();

    const start = new Date(Date.UTC(year, month, 1, 12, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 0, 12, 0, 0));

    return {
      startDate: formatCalendarDate(start),
      endDate: formatCalendarDate(end),
    };
  }

  return {
    startDate: selectedDate,
    endDate: selectedDate,
  };
};

const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  let cursor = parseCalendarDate(startDate);
  const end = parseCalendarDate(endDate);

  while (cursor <= end) {
    dates.push(formatCalendarDate(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
};

const getWeekDayNumber = (dateString) =>
  parseCalendarDate(dateString).getUTCDay();

const parseTimeToMinutes = (timeString = "00:00") => {
  const [hours, minutes] = String(timeString).split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return hours * 60 + minutes;
};

const getExpectedDailySeconds = (setting) => {
  const startMinutes = parseTimeToMinutes(setting.workStartTime || "08:30");
  const endMinutes = parseTimeToMinutes(setting.workEndTime || "17:30");

  let diffMinutes = endMinutes - startMinutes;

  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }

  return diffMinutes * 60;
};

const getSriLankaTimeMinutes = (value) => {
  if (!value) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value || 0
  );

  return (hour % 24) * 60 + minute;
};

const getOrCreateSetting = async () => {
  let setting = await AttendanceSetting.findOne().sort({ createdAt: 1 });

  if (!setting) {
    setting = await AttendanceSetting.create({});
  }

  return setting;
};

const isSessionPresent = (session) => {
  if (!session) return false;

  return Boolean(
    session.firstLoginAt ||
      session.lastSeenAt ||
      session.totalOnlineSeconds > 0 ||
      session.totalActiveSeconds > 0
  );
};

const getLeaveForDate = (leaveList = [], date) => {
  return leaveList.find(
    (leave) => leave.startDate <= date && leave.endDate >= date
  );
};

const getLiveTotals = async ({ session, now, isToday }) => {
  if (!session) {
    return {
      onlineSeconds: 0,
      activeSeconds: 0,
      breakSeconds: 0,
      idleSeconds: 0,
    };
  }

  let onlineSeconds = session.totalOnlineSeconds || 0;
  let breakSeconds = session.totalBreakSeconds || 0;
  const idleSeconds = session.totalIdleSeconds || 0;
  let activeSeconds = session.totalActiveSeconds || 0;

  if (isToday) {
    const openLog = await SessionLog.findOne({
      dailySession: session._id,
      isOpen: true,
    }).sort({ startTime: -1 });

    if (openLog) {
      onlineSeconds += getDurationInSeconds(openLog.startTime, now);
    }

    const openBreak = await BreakLog.findOne({
      dailySession: session._id,
      isOpen: true,
    }).sort({ startTime: -1 });

    if (openBreak) {
      breakSeconds += getDurationInSeconds(openBreak.startTime, now);
    }

    activeSeconds = onlineSeconds - breakSeconds - idleSeconds;

    if (activeSeconds < 0) {
      activeSeconds = 0;
    }
  }

  return {
    onlineSeconds,
    activeSeconds,
    breakSeconds,
    idleSeconds,
  };
};

const getDayCalculation = async ({
  session,
  date,
  setting,
  approvedLeave,
  now,
  today,
}) => {
  const isToday = date === today;

  const isWorkingDay = (setting.workingDays || [1, 2, 3, 4, 5]).includes(
    getWeekDayNumber(date)
  );

  const present = isSessionPresent(session);
  const onApprovedLeave = Boolean(approvedLeave);

  const shouldExpectWork = isWorkingDay && !onApprovedLeave;
  const expectedSeconds = shouldExpectWork
    ? getExpectedDailySeconds(setting)
    : 0;

  const liveTotals = await getLiveTotals({ session, now, isToday });

  const workStartMinutes = parseTimeToMinutes(setting.workStartTime || "08:30");
  const workEndMinutes = parseTimeToMinutes(setting.workEndTime || "17:30");

  const allowedLoginMinutes =
    workStartMinutes + Number(setting.graceMinutes || 0);

  const firstLoginMinutes = getSriLankaTimeMinutes(session?.firstLoginAt);
  const lastSeenMinutes = getSriLankaTimeMinutes(session?.lastSeenAt);

  const isLate = Boolean(
    present &&
      shouldExpectWork &&
      firstLoginMinutes !== null &&
      firstLoginMinutes > allowedLoginMinutes
  );

  const canCheckEarly =
    present &&
    shouldExpectWork &&
    lastSeenMinutes !== null &&
    (!isToday || ["offline", "completed"].includes(session?.currentStatus));

  const isEarly = Boolean(canCheckEarly && lastSeenMinutes < workEndMinutes);

  const overtimeSeconds = Math.max(
    0,
    liveTotals.activeSeconds - expectedSeconds
  );

  const shortageSeconds = Math.max(
    0,
    expectedSeconds - liveTotals.activeSeconds
  );

  let status = "Absent";

  if (onApprovedLeave && !present) {
    status = "On Leave";
  } else if (present) {
    status = "Present";
  } else if (!isWorkingDay) {
    status = "Non Working Day";
  }

  return {
    date,
    status,
    isWorkingDay,
    present,
    onApprovedLeave,
    isLate,
    isEarly,
    expectedSeconds,
    onlineSeconds: liveTotals.onlineSeconds,
    activeSeconds: liveTotals.activeSeconds,
    breakSeconds: liveTotals.breakSeconds,
    idleSeconds: liveTotals.idleSeconds,
    overtimeSeconds,
    shortageSeconds,
    session: session
      ? {
          _id: session._id,
          date: session.date,
          firstLoginAt: session.firstLoginAt,
          lastSeenAt: session.lastSeenAt,
          currentStatus: session.currentStatus,
        }
      : null,
    approvedLeave: approvedLeave
      ? {
          _id: approvedLeave._id,
          leaveType: approvedLeave.leaveType,
          startDate: approvedLeave.startDate,
          endDate: approvedLeave.endDate,
          reason: approvedLeave.reason,
          status: approvedLeave.status,
        }
      : null,
  };
};

const getActivityReportSummary = async (req, res) => {
  try {
    const type = ["daily", "weekly", "monthly"].includes(req.query.type)
      ? req.query.type
      : "daily";

    const selectedDate = DATE_REGEX.test(req.query.date || "")
      ? req.query.date
      : getSriLankaDateString();

    const search = String(req.query.search || "").trim();

    const role = ["employee", "manager"].includes(req.query.role)
      ? req.query.role
      : "all";

    const today = getSriLankaDateString();
    const now = new Date();

    const setting = await getOrCreateSetting();

    const { startDate, endDate } = getDateRange(type, selectedDate);
    const dates = getDatesBetween(startDate, endDate);

    const userQuery = {
      role: { $in: ["employee", "manager"] },
      accountStatus: "active",
    };

    if (role !== "all") {
      userQuery.role = role;
    }

    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const employees = await User.find(userQuery)
      .select("name email role phone department position accountStatus")
      .sort({ name: 1 });

    const employeeIds = employees.map((employee) => employee._id);

    const sessions = await DailyWorkSession.find({
      employee: { $in: employeeIds },
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    const approvedLeaves = await LeaveRequest.find({
      employee: { $in: employeeIds },
      status: "approved",
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    }).populate("reviewedBy", "name email role");

    const sessionMap = new Map();

    sessions.forEach((session) => {
      sessionMap.set(`${session.employee.toString()}_${session.date}`, session);
    });

    const leaveMap = new Map();

    approvedLeaves.forEach((leave) => {
      const key = leave.employee.toString();

      if (!leaveMap.has(key)) {
        leaveMap.set(key, []);
      }

      leaveMap.get(key).push(leave);
    });

    const rows = [];

    const summary = {
      totalUsers: employees.length,
      presentUsers: 0,
      absentUsers: 0,
      leaveUsers: 0,
      lateUsers: 0,
      earlyCheckoutUsers: 0,
      totalExpectedSeconds: 0,
      totalWorkSeconds: 0,
      totalOnlineSeconds: 0,
      totalBreakSeconds: 0,
      totalOvertimeSeconds: 0,
      totalShortageSeconds: 0,
    };

    for (const employee of employees) {
      const employeeId = employee._id.toString();
      const employeeLeaves = leaveMap.get(employeeId) || [];

      const dayRows = [];

      const rowTotals = {
        expectedDays: 0,
        effectiveExpectedDays: 0,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        lateDays: 0,
        earlyCheckoutDays: 0,
        expectedSeconds: 0,
        workSeconds: 0,
        onlineSeconds: 0,
        breakSeconds: 0,
        idleSeconds: 0,
        overtimeSeconds: 0,
        shortageSeconds: 0,
      };

      let firstLogin = null;
      let lastSeen = null;

      for (const date of dates) {
        const session = sessionMap.get(`${employeeId}_${date}`) || null;
        const approvedLeave = getLeaveForDate(employeeLeaves, date);

        const dayCalculation = await getDayCalculation({
          session,
          date,
          setting,
          approvedLeave,
          now,
          today,
        });

        if (dayCalculation.isWorkingDay) {
          rowTotals.expectedDays += 1;
        }

        if (dayCalculation.expectedSeconds > 0) {
          rowTotals.effectiveExpectedDays += 1;
        }

        if (dayCalculation.present) {
          rowTotals.presentDays += 1;
        }

        if (
          dayCalculation.isWorkingDay &&
          !dayCalculation.present &&
          !dayCalculation.onApprovedLeave
        ) {
          rowTotals.absentDays += 1;
        }

        if (dayCalculation.onApprovedLeave) {
          rowTotals.leaveDays += 1;
        }

        if (dayCalculation.isLate) {
          rowTotals.lateDays += 1;
        }

        if (dayCalculation.isEarly) {
          rowTotals.earlyCheckoutDays += 1;
        }

        rowTotals.expectedSeconds += dayCalculation.expectedSeconds;
        rowTotals.workSeconds += dayCalculation.activeSeconds;
        rowTotals.onlineSeconds += dayCalculation.onlineSeconds;
        rowTotals.breakSeconds += dayCalculation.breakSeconds;
        rowTotals.idleSeconds += dayCalculation.idleSeconds;
        rowTotals.overtimeSeconds += dayCalculation.overtimeSeconds;
        rowTotals.shortageSeconds += dayCalculation.shortageSeconds;

        if (session?.firstLoginAt) {
          if (
            !firstLogin ||
            new Date(session.firstLoginAt) < new Date(firstLogin)
          ) {
            firstLogin = session.firstLoginAt;
          }
        }

        if (session?.lastSeenAt) {
          if (!lastSeen || new Date(session.lastSeenAt) > new Date(lastSeen)) {
            lastSeen = session.lastSeenAt;
          }
        }

        dayRows.push({
          date: dayCalculation.date,
          status: dayCalculation.status,
          firstLoginAt: session?.firstLoginAt || null,
          lastSeenAt: session?.lastSeenAt || null,
          expectedSeconds: dayCalculation.expectedSeconds,
          expectedTime: formatSecondsToTime(dayCalculation.expectedSeconds),
          onlineSeconds: dayCalculation.onlineSeconds,
          onlineTime: formatSecondsToTime(dayCalculation.onlineSeconds),
          workSeconds: dayCalculation.activeSeconds,
          workTime: formatSecondsToTime(dayCalculation.activeSeconds),
          breakSeconds: dayCalculation.breakSeconds,
          breakTime: formatSecondsToTime(dayCalculation.breakSeconds),
          idleSeconds: dayCalculation.idleSeconds,
          idleTime: formatSecondsToTime(dayCalculation.idleSeconds),
          overtimeSeconds: dayCalculation.overtimeSeconds,
          overtime: formatSecondsToTime(dayCalculation.overtimeSeconds),
          shortageSeconds: dayCalculation.shortageSeconds,
          shortage: formatSecondsToTime(dayCalculation.shortageSeconds),
          isLate: dayCalculation.isLate,
          isEarly: dayCalculation.isEarly,
          isWorkingDay: dayCalculation.isWorkingDay,
          approvedLeave: dayCalculation.approvedLeave,
          session: dayCalculation.session,
        });
      }

      let status = "Absent";

      if (rowTotals.presentDays > 0 && rowTotals.absentDays === 0) {
        status = "Present";
      } else if (rowTotals.presentDays > 0 && rowTotals.absentDays > 0) {
        status = "Partial";
      } else if (rowTotals.leaveDays > 0 && rowTotals.absentDays === 0) {
        status = "On Leave";
      }

      if (rowTotals.presentDays > 0) summary.presentUsers += 1;
      else if (rowTotals.leaveDays > 0) summary.leaveUsers += 1;
      else summary.absentUsers += 1;

      if (rowTotals.lateDays > 0) summary.lateUsers += 1;
      if (rowTotals.earlyCheckoutDays > 0) {
        summary.earlyCheckoutUsers += 1;
      }

      summary.totalExpectedSeconds += rowTotals.expectedSeconds;
      summary.totalWorkSeconds += rowTotals.workSeconds;
      summary.totalOnlineSeconds += rowTotals.onlineSeconds;
      summary.totalBreakSeconds += rowTotals.breakSeconds;
      summary.totalOvertimeSeconds += rowTotals.overtimeSeconds;
      summary.totalShortageSeconds += rowTotals.shortageSeconds;

      rows.push({
        user: {
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          phone: employee.phone,
          department: employee.department,
          position: employee.position,
          accountStatus: employee.accountStatus,
        },
        status,
        expectedDays: rowTotals.expectedDays,
        effectiveExpectedDays: rowTotals.effectiveExpectedDays,
        presentDays: rowTotals.presentDays,
        absentDays: rowTotals.absentDays,
        leaveDays: rowTotals.leaveDays,
        lateDays: rowTotals.lateDays,
        earlyCheckoutDays: rowTotals.earlyCheckoutDays,
        firstLogin,
        lastSeen,
        expectedSeconds: rowTotals.expectedSeconds,
        expectedTime: formatSecondsToTime(rowTotals.expectedSeconds),
        workSeconds: rowTotals.workSeconds,
        workTime: formatSecondsToTime(rowTotals.workSeconds),
        onlineSeconds: rowTotals.onlineSeconds,
        onlineTime: formatSecondsToTime(rowTotals.onlineSeconds),
        breakSeconds: rowTotals.breakSeconds,
        breakTime: formatSecondsToTime(rowTotals.breakSeconds),
        idleSeconds: rowTotals.idleSeconds,
        idleTime: formatSecondsToTime(rowTotals.idleSeconds),
        overtimeSeconds: rowTotals.overtimeSeconds,
        overtime: formatSecondsToTime(rowTotals.overtimeSeconds),
        shortageSeconds: rowTotals.shortageSeconds,
        shortage: formatSecondsToTime(rowTotals.shortageSeconds),
        sessions: dayRows,
      });
    }

    summary.totalExpectedTime = formatSecondsToTime(
      summary.totalExpectedSeconds
    );
    summary.totalWorkTime = formatSecondsToTime(summary.totalWorkSeconds);
    summary.totalOnlineTime = formatSecondsToTime(summary.totalOnlineSeconds);
    summary.totalBreakTime = formatSecondsToTime(summary.totalBreakSeconds);
    summary.totalOvertime = formatSecondsToTime(summary.totalOvertimeSeconds);
    summary.totalShortage = formatSecondsToTime(summary.totalShortageSeconds);

    res.status(200).json({
      success: true,
      report: {
        type,
        selectedDate,
        startDate,
        endDate,
        generatedAt: now,
        settings: {
          workStartTime: setting.workStartTime,
          workEndTime: setting.workEndTime,
          graceMinutes: setting.graceMinutes,
          workingDays: setting.workingDays,
        },
        summary,
        rows,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate activity report",
      error: error.message,
    });
  }
};

const getActivityReportSettings = async (req, res) => {
  try {
    const setting = await getOrCreateSetting();

    res.status(200).json({
      success: true,
      settings: {
        _id: setting._id,
        workStartTime: setting.workStartTime,
        workEndTime: setting.workEndTime,
        graceMinutes: setting.graceMinutes,
        workingDays: setting.workingDays,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load activity report settings",
      error: error.message,
    });
  }
};

const updateActivityReportSettings = async (req, res) => {
  try {
    const { workStartTime, workEndTime, graceMinutes, workingDays } = req.body;

    const timeRegex = /^\d{2}:\d{2}$/;

    if (workStartTime && !timeRegex.test(workStartTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid work start time. Use HH:mm format.",
      });
    }

    if (workEndTime && !timeRegex.test(workEndTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid work end time. Use HH:mm format.",
      });
    }

    const setting = await getOrCreateSetting();

    if (workStartTime !== undefined) setting.workStartTime = workStartTime;
    if (workEndTime !== undefined) setting.workEndTime = workEndTime;

    if (graceMinutes !== undefined) {
      setting.graceMinutes = Math.max(0, Number(graceMinutes || 0));
    }

    if (Array.isArray(workingDays)) {
      setting.workingDays = workingDays
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    }

    await setting.save();

    res.status(200).json({
      success: true,
      message: "Activity report settings updated successfully",
      settings: {
        _id: setting._id,
        workStartTime: setting.workStartTime,
        workEndTime: setting.workEndTime,
        graceMinutes: setting.graceMinutes,
        workingDays: setting.workingDays,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update activity report settings",
      error: error.message,
    });
  }
};

module.exports = {
  getActivityReportSummary,
  getActivityReportSettings,
  updateActivityReportSettings,
};