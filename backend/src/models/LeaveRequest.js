const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    leaveType: {
      type: String,
      enum: [
        "annual",
        "casual",
        "sick",
        "half_day",
        "short_leave",
        "emergency",
      ],
      required: true,
    },

    startDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },

    endDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },

    numberOfDays: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },

    adminComment: {
      type: String,
      default: "",
      trim: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ employee: 1, startDate: 1, endDate: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);