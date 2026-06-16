const User = require("../models/User");

// @desc    Get all employees live status
// @route   GET /api/presence/employees
// @access  Admin / Manager
const getEmployeePresenceList = async (req, res) => {
  try {
    const employees = await User.find({
      role: { $in: ["employee", "manager"] },
      accountStatus: { $ne: "resigned" },
    })
      .select(
        "name email role phone department position accountStatus presenceStatus lastSeenAt lastLoginAt"
      )
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get employee presence list",
      error: error.message,
    });
  }
};

module.exports = {
  getEmployeePresenceList,
};