const mongoose = require("mongoose");

const breakLogSchema = new mongoose.Schema(
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

    breakType: {
      type: String,
      enum: ["breakfast", "lunch", "tea"],
      required: true,
    },

    allowedMinutes: {
      type: Number,
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

    usedSeconds: {
      type: Number,
      default: 0,
    },

    exceededSeconds: {
      type: Number,
      default: 0,
    },

    isExceeded: {
      type: Boolean,
      default: false,
    },

    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

breakLogSchema.index({ employee: 1, date: 1, isOpen: 1 });

module.exports = mongoose.model("BreakLog", breakLogSchema);