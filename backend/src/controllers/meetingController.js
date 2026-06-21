const Meeting = require("../models/Meeting");
const User = require("../models/User");

const ALLOWED_ROLES = ["admin", "manager", "employee"];
const INVITABLE_ROLES = ["manager", "employee"];

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

const getCurrentUserId = (req) => {
  return req.user?._id || req.user?.id || req.user?.userId;
};

const getCurrentUserName = (user) => {
  if (!user) return "Unknown User";

  const combinedName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    user.name ||
    user.fullName ||
    user.username ||
    combinedName ||
    user.email ||
    "Unknown User"
  );
};

const isValidMeetingUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

const emitToEveryone = (req, eventName, payload) => {
  const io = req.app.get("io");

  if (io) {
    io.emit(eventName, payload);
  }
};

const emitToAdminsAndInvitees = (req, eventName, payload, inviteeIds = []) => {
  const io = req.app.get("io");

  if (!io) return;

  io.to("admins").emit(eventName, payload);

  inviteeIds.forEach((userId) => {
    io.to(`user:${userId}`).emit(eventName, payload);
  });
};

const getMeetingInviteeIds = (meeting) => {
  if (!meeting || meeting.invitationMode !== "selected") return [];

  return (meeting.invitedUsers || [])
    .map((invitee) => getIdString(invitee.user))
    .filter(Boolean);
};

const isUserInvitedToMeeting = (meeting, userId) => {
  if (!meeting || !userId) return false;

  if (meeting.invitationMode !== "selected") {
    return true;
  }

  const currentUserId = String(userId);

  return (meeting.invitedUsers || []).some(
    (invitee) => getIdString(invitee.user) === currentUserId
  );
};

const canUserAccessMeeting = (meeting, user) => {
  if (!meeting || !user) return false;

  const userId = getIdString(user._id || user.id);

  if (user.role === "admin") return true;

  if (getIdString(meeting.createdBy) === userId) {
    return true;
  }

  return isUserInvitedToMeeting(meeting, userId);
};

const toParticipantResponse = (participant) => {
  return {
    user: getIdString(participant.user),
    name: participant.name,
    email: participant.email,
    role: participant.role,
    joinedAt: participant.joinedAt,
    lastJoinedAt: participant.lastJoinedAt,
    joinCount: participant.joinCount,
  };
};

const toInviteeResponse = (invitee) => {
  return {
    user: getIdString(invitee.user),
    name: invitee.name,
    email: invitee.email,
    role: invitee.role,
    invitedAt: invitee.invitedAt,
  };
};

const toPublicMeetingResponse = (meeting, currentUserId = null) => {
  if (!meeting) return null;

  const userId = currentUserId ? String(currentUserId) : null;

  const currentUserJoined = userId
    ? meeting.participants?.some((participant) => {
        return getIdString(participant.user) === userId;
      })
    : false;

  const currentUserInvited = userId
    ? isUserInvitedToMeeting(meeting, userId)
    : false;

  return {
    _id: meeting._id,
    title: meeting.title,
    description: meeting.description,

    // Important: meetingUrl is intentionally hidden here.
    // User receives the real URL only after joinMeeting validates access.
    invitationMode: meeting.invitationMode || "all",
    invitedCount: meeting.invitedUsers?.length || 0,

    status: meeting.status,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,

    participantCount: meeting.participants?.length || 0,
    currentUserJoined,
    currentUserInvited,
  };
};

const toAdminMeetingResponse = (meeting) => {
  if (!meeting) return null;

  const createdBy = meeting.createdBy?._id
    ? {
        _id: meeting.createdBy._id,
        name: getCurrentUserName(meeting.createdBy),
        email: meeting.createdBy.email || "",
        role: meeting.createdBy.role || "",
      }
    : meeting.createdBy;

  return {
    _id: meeting._id,
    title: meeting.title,
    description: meeting.description,
    meetingUrl: meeting.meetingUrl,

    invitationMode: meeting.invitationMode || "all",
    invitedCount: meeting.invitedUsers?.length || 0,
    invitedUsers: meeting.invitedUsers?.map(toInviteeResponse) || [],

    status: meeting.status,
    createdBy,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,

    participantCount: meeting.participants?.length || 0,
    participants: meeting.participants?.map(toParticipantResponse) || [],
  };
};

const emitMeetingEvent = (req, eventName, meeting, payload) => {
  const responsePayload = payload || toPublicMeetingResponse(meeting);

  if (meeting?.invitationMode === "selected") {
    emitToAdminsAndInvitees(
      req,
      eventName,
      responsePayload,
      getMeetingInviteeIds(meeting)
    );

    return;
  }

  emitToEveryone(req, eventName, responsePayload);
};

const getSriLankaDateRange = (dateString) => {
  const start = new Date(`${dateString}T00:00:00.000+05:30`);
  const end = new Date(`${dateString}T23:59:59.999+05:30`);

  return { start, end };
};

const normalizeInvitedUsers = (value) => {
  const rawList = Array.isArray(value) ? value : value ? [value] : [];

  const cleaned = rawList
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return [...new Set(cleaned)];
};

const buildInvitees = async (invitedUserIds) => {
  if (!invitedUserIds.length) {
    return {
      valid: true,
      message: "",
      invitees: [],
    };
  }

  const users = await User.find({
    _id: { $in: invitedUserIds },
    role: { $in: INVITABLE_ROLES },
    accountStatus: "active",
  }).select(
    "name fullName firstName lastName username email role department position accountStatus"
  );

  if (users.length !== invitedUserIds.length) {
    return {
      valid: false,
      message: "One or more selected users were not found or are inactive",
      invitees: [],
    };
  }

  return {
    valid: true,
    message: "",
    invitees: users.map((user) => ({
      user: user._id,
      name: getCurrentUserName(user),
      email: user.email || "",
      role: user.role,
      invitedAt: new Date(),
    })),
  };
};

// @desc    Get users that can receive selected meetings
// @route   GET /api/meetings/invite-users?search=&role=all
// @access  Admin
exports.getMeetingInviteUsers = async (req, res) => {
  try {
    const { search = "", role = "all" } = req.query;

    const filter = {
      role: { $in: INVITABLE_ROLES },
      accountStatus: "active",
    };

    if (role && role !== "all") {
      if (!INVITABLE_ROLES.includes(role)) {
        return sendError(res, 400, "Invalid role filter");
      }

      filter.role = role;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        { name: regex },
        { fullName: regex },
        { firstName: regex },
        { lastName: regex },
        { username: regex },
        { email: regex },
        { role: regex },
        { department: regex },
        { position: regex },
      ];
    }

    const users = await User.find(filter)
      .select(
        "name fullName firstName lastName username email role department position accountStatus"
      )
      .sort({
        role: 1,
        name: 1,
        email: 1,
      });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get meeting invite users error:", error);

    return sendError(res, 500, "Failed to load users");
  }
};

// @desc    Create meeting
// @route   POST /api/meetings
// @access  Admin
exports.createMeeting = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const {
      title,
      description,
      meetingUrl,
      invitationMode = "selected",
      invitedUsers,
    } = req.body;

    if (!userId) {
      return sendError(res, 401, "Unauthorized user");
    }

    if (!title || !title.trim()) {
      return sendError(res, 400, "Meeting title is required");
    }

    if (!meetingUrl || !meetingUrl.trim()) {
      return sendError(res, 400, "Meeting link is required");
    }

    if (!isValidMeetingUrl(meetingUrl.trim())) {
      return sendError(res, 400, "Please enter a valid meeting link");
    }

    const mode = invitationMode === "all" ? "all" : "selected";
    const invitedUserIds = normalizeInvitedUsers(invitedUsers);

    let invitees = [];

    if (mode === "selected") {
      if (!invitedUserIds.length) {
        return sendError(
          res,
          400,
          "Please select at least one meeting receiver"
        );
      }

      const result = await buildInvitees(invitedUserIds);

      if (!result.valid) {
        return sendError(res, 400, result.message);
      }

      invitees = result.invitees;
    }

    const meeting = await Meeting.create({
      title: title.trim(),
      description: description?.trim() || "",
      meetingUrl: meetingUrl.trim(),
      invitationMode: mode,
      invitedUsers: invitees,
      createdBy: userId,
      status: "scheduled",
    });

    const fullMeeting = await Meeting.findById(meeting._id).populate(
      "createdBy",
      "name fullName firstName lastName username email role"
    );

    emitMeetingEvent(req, "meetingCreated", fullMeeting);

    return res.status(201).json({
      success: true,
      message:
        mode === "selected"
          ? "Meeting created for selected people successfully"
          : "Meeting created for everyone successfully",
      meeting: toAdminMeetingResponse(fullMeeting),
    });
  } catch (error) {
    console.error("Create meeting error:", error);

    return sendError(res, 500, "Failed to create meeting");
  }
};

// @desc    Get current scheduled/live meeting for invited users
// @route   GET /api/meetings/active
// @access  Admin, Manager, Employee
exports.getActiveMeeting = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const accessFilter =
      req.user?.role === "admin"
        ? {}
        : {
            $or: [
              { invitationMode: "all" },
              { "invitedUsers.user": userId },
              { createdBy: userId },
            ],
          };

    let meeting = await Meeting.findOne({
      status: "live",
      ...accessFilter,
    }).sort({
      startedAt: -1,
      createdAt: -1,
    });

    if (!meeting) {
      meeting = await Meeting.findOne({
        status: "scheduled",
        ...accessFilter,
      }).sort({
        createdAt: -1,
      });
    }

    return res.status(200).json({
      success: true,
      meeting: meeting ? toPublicMeetingResponse(meeting, userId) : null,
    });
  } catch (error) {
    console.error("Get active meeting error:", error);

    return sendError(res, 500, "Failed to load active meeting");
  }
};

// @desc    Admin get meetings
// @route   GET /api/meetings/admin?date=YYYY-MM-DD&status=all
// @access  Admin
exports.getAdminMeetings = async (req, res) => {
  try {
    const { date, status } = req.query;

    const filter = {};

    if (status && status !== "all") {
      if (!["scheduled", "live", "ended"].includes(status)) {
        return sendError(res, 400, "Invalid meeting status");
      }

      filter.status = status;
    }

    if (date) {
      const { start, end } = getSriLankaDateRange(date);

      filter.$or = [
        { createdAt: { $gte: start, $lte: end } },
        { startedAt: { $gte: start, $lte: end } },
        { endedAt: { $gte: start, $lte: end } },
        { "participants.joinedAt": { $gte: start, $lte: end } },
        { "participants.lastJoinedAt": { $gte: start, $lte: end } },
        { "invitedUsers.invitedAt": { $gte: start, $lte: end } },
      ];
    }

    const meetings = await Meeting.find(filter)
      .populate(
        "createdBy",
        "name fullName firstName lastName username email role"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: meetings.length,
      meetings: meetings.map(toAdminMeetingResponse),
    });
  } catch (error) {
    console.error("Get admin meetings error:", error);

    return sendError(res, 500, "Failed to load meetings");
  }
};

// @desc    Admin get one meeting
// @route   GET /api/meetings/:id
// @access  Admin
exports.getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate(
      "createdBy",
      "name fullName firstName lastName username email role"
    );

    if (!meeting) {
      return sendError(res, 404, "Meeting not found");
    }

    return res.status(200).json({
      success: true,
      meeting: toAdminMeetingResponse(meeting),
    });
  } catch (error) {
    console.error("Get meeting by id error:", error);

    return sendError(res, 500, "Failed to load meeting");
  }
};

// @desc    Start meeting
// @route   PATCH /api/meetings/:id/start
// @access  Admin
exports.startMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return sendError(res, 404, "Meeting not found");
    }

    if (meeting.status === "ended") {
      return sendError(res, 400, "Ended meeting cannot be started again");
    }

    const anotherLiveMeeting = await Meeting.findOne({
      _id: { $ne: meeting._id },
      status: "live",
    });

    if (anotherLiveMeeting) {
      return sendError(
        res,
        409,
        "Another meeting is already live. Please end it first."
      );
    }

    meeting.status = "live";
    meeting.startedAt = meeting.startedAt || new Date();
    meeting.endedAt = null;

    await meeting.save();

    const updatedMeeting = await Meeting.findById(meeting._id).populate(
      "createdBy",
      "name fullName firstName lastName username email role"
    );

    emitMeetingEvent(req, "meetingStarted", updatedMeeting);

    return res.status(200).json({
      success: true,
      message:
        updatedMeeting.invitationMode === "selected"
          ? "Meeting started for selected people"
          : "Meeting started successfully",
      meeting: toAdminMeetingResponse(updatedMeeting),
    });
  } catch (error) {
    console.error("Start meeting error:", error);

    return sendError(res, 500, "Failed to start meeting");
  }
};

// @desc    End meeting
// @route   PATCH /api/meetings/:id/end
// @access  Admin
exports.endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return sendError(res, 404, "Meeting not found");
    }

    if (meeting.status === "ended") {
      return res.status(200).json({
        success: true,
        message: "Meeting already ended",
        meeting: toAdminMeetingResponse(meeting),
      });
    }

    meeting.status = "ended";
    meeting.endedAt = new Date();

    await meeting.save();

    const updatedMeeting = await Meeting.findById(meeting._id).populate(
      "createdBy",
      "name fullName firstName lastName username email role"
    );

    emitMeetingEvent(req, "meetingEnded", updatedMeeting, {
      _id: updatedMeeting._id,
      status: updatedMeeting.status,
      endedAt: updatedMeeting.endedAt,
    });

    return res.status(200).json({
      success: true,
      message: "Meeting ended successfully",
      meeting: toAdminMeetingResponse(updatedMeeting),
    });
  } catch (error) {
    console.error("End meeting error:", error);

    return sendError(res, 500, "Failed to end meeting");
  }
};

// @desc    User join meeting
// @route   POST /api/meetings/:id/join
// @access  Admin, Manager, Employee
exports.joinMeeting = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const user = req.user;

    if (!userId || !user) {
      return sendError(res, 401, "Unauthorized user");
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return sendError(res, 403, "You are not allowed to join this meeting");
    }

    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return sendError(res, 404, "Meeting not found");
    }

    if (!canUserAccessMeeting(meeting, user)) {
      return sendError(res, 403, "This meeting is not assigned to you");
    }

    if (meeting.status !== "live") {
      return sendError(res, 400, "Meeting is not live now");
    }

    const now = new Date();
    const userIdString = String(userId);

    const existingParticipant = meeting.participants.find((participant) => {
      return getIdString(participant.user) === userIdString;
    });

    let savedParticipant;

    if (existingParticipant) {
      existingParticipant.lastJoinedAt = now;
      existingParticipant.joinCount = (existingParticipant.joinCount || 1) + 1;
      savedParticipant = existingParticipant;
    } else {
      const newParticipant = {
        user: userId,
        name: getCurrentUserName(user),
        email: user.email || "",
        role: user.role,
        joinedAt: now,
        lastJoinedAt: now,
        joinCount: 1,
      };

      meeting.participants.push(newParticipant);
      savedParticipant = newParticipant;
    }

    await meeting.save();

    const participantResponse = toParticipantResponse(savedParticipant);

    emitMeetingEvent(req, "meetingUserJoined", meeting, {
      meetingId: meeting._id,
      participant: participantResponse,
    });

    return res.status(200).json({
      success: true,
      message: "Join recorded successfully",
      meetingUrl: meeting.meetingUrl,
      participant: participantResponse,
    });
  } catch (error) {
    console.error("Join meeting error:", error);

    return sendError(res, 500, "Failed to join meeting");
  }
};