const mongoose = require("mongoose");

const dailyWorkSessionSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    firstLoginAt: {
      type: Date,
      default: null,
    },

    lastSeenAt: {
      type: Date,
      default: null,
    },

    currentStatus: {
      type: String,
      enum: [
        "not_started",
        "online",
        "offline",
        "idle",
        "on_break",
        "completed",
      ],
      default: "not_started",
    },

    activeSegmentStartedAt: {
      type: Date,
      default: null,
    },

    totalOnlineSeconds: {
      type: Number,
      default: 0,
    },

    totalBreakSeconds: {
      type: Number,
      default: 0,
    },

    totalIdleSeconds: {
      type: Number,
      default: 0,
    },

    totalInactiveSeconds: {
      type: Number,
      default: 0,
    },

    totalActiveSeconds: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

dailyWorkSessionSchema.index(
  { employee: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("DailyWorkSession", dailyWorkSessionSchema);