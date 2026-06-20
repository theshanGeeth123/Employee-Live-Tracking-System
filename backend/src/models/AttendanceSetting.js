const mongoose = require("mongoose");

const attendanceSettingSchema = new mongoose.Schema(
  {
    workStartTime: {
      type: String,
      default: "08:30",
    },

    workEndTime: {
      type: String,
      default: "17:30",
    },

    graceMinutes: {
      type: Number,
      default: 15,
    },

    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
      // 0 = Sunday, 1 = Monday, 2 = Tuesday, ... 6 = Saturday
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AttendanceSetting", attendanceSettingSchema);