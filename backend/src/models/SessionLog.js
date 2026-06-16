const mongoose = require("mongoose");

const sessionLogSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dailySession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyWorkSession",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      default: null,
    },

    durationSeconds: {
      type: Number,
      default: 0,
    },

    startReason: {
      type: String,
      enum: ["login", "reconnect", "socket_connect"],
      default: "socket_connect",
    },

    endReason: {
      type: String,
      enum: ["logout", "disconnect", "browser_closed", "server_restart"],
      default: null,
    },

    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

sessionLogSchema.index({ employee: 1, date: 1, isOpen: 1 });

module.exports = mongoose.model("SessionLog", sessionLogSchema);