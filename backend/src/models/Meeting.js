const mongoose = require("mongoose");

const meetingParticipantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      enum: ["admin", "manager", "employee"],
      required: true,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    lastJoinedAt: {
      type: Date,
      default: Date.now,
    },

    joinCount: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Meeting title is required"],
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    meetingUrl: {
      type: String,
      required: [true, "Meeting link is required"],
      trim: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "live", "ended"],
      default: "scheduled",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    participants: [meetingParticipantSchema],
  },
  { timestamps: true }
);

meetingSchema.index({ status: 1, createdAt: -1 });
meetingSchema.index({ startedAt: -1 });
meetingSchema.index({ "participants.user": 1 });

module.exports = mongoose.model("Meeting", meetingSchema);