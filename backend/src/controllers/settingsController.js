const {
  getSystemSettings,
  updateSystemSettings,
  resetSystemSettings,
} = require("../services/settingsService");

// @desc    Get system settings
// @route   GET /api/settings
// @access  Admin / Manager
const getSettings = async (req, res) => {
  try {
    const settings = await getSystemSettings();

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get settings",
      error: error.message,
    });
  }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Admin
const updateSettings = async (req, res) => {
  try {
    const settings = await updateSystemSettings(req.body);

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update settings",
      error: error.message,
    });
  }
};

// @desc    Reset settings to default
// @route   POST /api/settings/reset
// @access  Admin
const resetSettingsToDefault = async (req, res) => {
  try {
    const settings = await resetSystemSettings();

    res.status(200).json({
      success: true,
      message: "Settings reset to default successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reset settings",
      error: error.message,
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  resetSettingsToDefault,
};