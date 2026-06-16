const SystemSetting = require("../models/SystemSetting");

const DEFAULT_SETTINGS = {
  key: "main",

  breaks: {
    breakfast: {
      label: "Breakfast",
      allowedMinutes: 30,
      enabled: true,
    },
    lunch: {
      label: "Lunch",
      allowedMinutes: 60,
      enabled: true,
    },
    tea: {
      label: "Tea",
      allowedMinutes: 15,
      enabled: true,
    },
  },

  presence: {
    offlineGraceSeconds: 10,
    heartbeatIntervalSeconds: 20,
    idleTimeoutMinutes: 10,
  },

  office: {
    timezone: "Asia/Colombo",
    startTime: "08:30",
    endTime: "17:00",
  },

  leave: {
    allowEmergencyPastDate: true,
  },
};

const deepMerge = (target, source) => {
  const output = { ...target };

  if (!source || typeof source !== "object") {
    return output;
  }

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue)
    ) {
      output[key] = deepMerge(output[key] || {}, sourceValue);
    } else if (sourceValue !== undefined) {
      output[key] = sourceValue;
    }
  });

  return output;
};

const getSystemSettings = async () => {
  let settings = await SystemSetting.findOne({ key: "main" });

  if (!settings) {
    settings = await SystemSetting.create(DEFAULT_SETTINGS);
  }

  return settings;
};

const updateSystemSettings = async (updates) => {
  const currentSettings = await getSystemSettings();

  const currentObject = currentSettings.toObject();

  delete currentObject._id;
  delete currentObject.__v;
  delete currentObject.createdAt;
  delete currentObject.updatedAt;

  const mergedSettings = deepMerge(currentObject, updates);

  mergedSettings.key = "main";

  const updatedSettings = await SystemSetting.findOneAndUpdate(
    { key: "main" },
    mergedSettings,
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  return updatedSettings;
};

const resetSystemSettings = async () => {
  await SystemSetting.deleteOne({ key: "main" });

  const settings = await SystemSetting.create(DEFAULT_SETTINGS);

  return settings;
};

const getBreakRulesFromSettings = async () => {
  const settings = await getSystemSettings();

  return {
    breakfast: {
      label: settings.breaks.breakfast.label,
      allowedMinutes: settings.breaks.breakfast.allowedMinutes,
      enabled: settings.breaks.breakfast.enabled,
    },
    lunch: {
      label: settings.breaks.lunch.label,
      allowedMinutes: settings.breaks.lunch.allowedMinutes,
      enabled: settings.breaks.lunch.enabled,
    },
    tea: {
      label: settings.breaks.tea.label,
      allowedMinutes: settings.breaks.tea.allowedMinutes,
      enabled: settings.breaks.tea.enabled,
    },
  };
};

module.exports = {
  DEFAULT_SETTINGS,
  getSystemSettings,
  updateSystemSettings,
  resetSystemSettings,
  getBreakRulesFromSettings,
};