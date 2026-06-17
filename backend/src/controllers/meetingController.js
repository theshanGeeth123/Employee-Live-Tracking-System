const Meeting = require("../models/Meeting");

const ALLOWED_ROLES = ["admin", "manager", "employee"];

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

  const combinedName = [user.firstName, user.lastName].filter(Boolean).join(" ");

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

const emitSocketEvent = (req, eventName, payload) => {
  const io = req.app.get("io");

  if (io) {
    io.emit(eventName, payload);
  }
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

const toPublicMeetingResponse = (meeting, currentUserId = null) => {
  if (!meeting) return null;

  const userId = currentUserId ? String(currentUserId) : null;

  const currentUserJoined = userId
    ? meeting.participants?.some((p) => getIdString(p.user) === userId)
    : false;

  return {
    _id: meeting._id,
    title: meeting.title,
    description: meeting.description,
    status: meeting.status,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    participantCount: meeting.participants?.length || 0,
    currentUserJoined,
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

const getSriLankaDateRange = (dateString) => {
  const start = new Date(`${dateString}T00:00:00.000+05:30`);
  const end = new Date(`${dateString}T23:59:59.999+05:30`);

  return { start, end };
};

// @desc    Create meeting
// @route   POST /api/meetings
// @access  Admin
exports.createMeeting = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const { title, description, meetingUrl } = req.body;

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

    const meeting = await Meeting.create({
      title: title.trim(),
      description: description?.trim() || "",
      meetingUrl: meetingUrl.trim(),
      createdBy: userId,
      status: "scheduled",
    });

    const fullMeeting = await Meeting.findById(meeting._id).populate(
      "createdBy",
      "name fullName firstName lastName username email role"
    );

    emitSocketEvent(req, "meetingCreated", toPublicMeetingResponse(fullMeeting));

    return res.status(201).json({
      success: true,
      message: "Meeting created successfully",
      meeting: toAdminMeetingResponse(fullMeeting),
    });
  } catch (error) {
    console.error("Create meeting error:", error);
    return sendError(res, 500, "Failed to create meeting");
  }
};

// @desc    Get current scheduled/live meeting for users
// @route   GET /api/meetings/active
// @access  Admin, Manager, Employee
exports.getActiveMeeting = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    let meeting = await Meeting.findOne({ status: "live" }).sort({
      startedAt: -1,
      createdAt: -1,
    });

    if (!meeting) {
      meeting = await Meeting.findOne({ status: "scheduled" }).sort({
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
      ];
    }

    const meetings = await Meeting.find(filter)
      .populate("createdBy", "name fullName firstName lastName username email role")
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

    emitSocketEvent(
      req,
      "meetingStarted",
      toPublicMeetingResponse(updatedMeeting)
    );

    return res.status(200).json({
      success: true,
      message: "Meeting started successfully",
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

    emitSocketEvent(req, "meetingEnded", {
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

    if (meeting.status !== "live") {
      return sendError(res, 400, "Meeting is not live now");
    }

    const now = new Date();
    const userIdString = String(userId);

    const existingParticipant = meeting.participants.find(
      (participant) => getIdString(participant.user) === userIdString
    );

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

    emitSocketEvent(req, "meetingUserJoined", {
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