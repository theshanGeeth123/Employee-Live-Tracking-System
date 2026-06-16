const mongoose = require("mongoose");

const breakSettingSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
    },
    allowedMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 300,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "main",
      unique: true,
    },

    breaks: {
      breakfast: {
        type: breakSettingSchema,
        default: {
          label: "Breakfast",
          allowedMinutes: 30,
          enabled: true,
        },
      },
      lunch: {
        type: breakSettingSchema,
        default: {
          label: "Lunch",
          allowedMinutes: 60,
          enabled: true,
        },
      },
      tea: {
        type: breakSettingSchema,
        default: {
          label: "Tea",
          allowedMinutes: 15,
          enabled: true,
        },
      },
    },

    presence: {
      offlineGraceSeconds: {
        type: Number,
        default: 10,
        min: 1,
        max: 600,
      },
      heartbeatIntervalSeconds: {
        type: Number,
        default: 20,
        min: 5,
        max: 300,
      },
      idleTimeoutMinutes: {
        type: Number,
        default: 10,
        min: 1,
        max: 480,
      },
    },

    office: {
      timezone: {
        type: String,
        default: "Asia/Colombo",
      },
      startTime: {
        type: String,
        default: "08:30",
      },
      endTime: {
        type: String,
        default: "17:00",
      },
    },

    leave: {
      allowEmergencyPastDate: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemSetting", systemSettingSchema);