const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "user_online",
        "user_offline",
        "break_started",
        "break_ended",
        "break_exceeded",
        "leave_requested",
        "leave_approved",
        "leave_rejected",
        "leave_cancelled",
        "system",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Example: ["admin"], ["admin", "manager"]
    targetRoles: [
      {
        type: String,
        enum: ["admin", "manager", "employee"],
      },
    ],

    // For notification to one specific user
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Employee related to this notification
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    relatedLeaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      default: null,
    },

    relatedBreakLog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BreakLog",
      default: null,
    },

    metadata: {
      type: Object,
      default: {},
    },

    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

notificationSchema.index({ targetUser: 1, createdAt: -1 });
notificationSchema.index({ targetRoles: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);