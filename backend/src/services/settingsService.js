const SystemSetting = require("../models/SystemSetting");

const DEFAULT_SETTINGS = {
  key: "main",

  breaks: {
    breakfast: {
      label: "Breakfast",
      allowedMinutes: 30,
      enabled: true,
      startTime: "08:30",
      endTime: "10:30",
      onePerDay: true,
    },
    lunch: {
      label: "Lunch",
      allowedMinutes: 60,
      enabled: true,
      startTime: "12:00",
      endTime: "14:30",
      onePerDay: true,
    },
    tea: {
      label: "Tea",
      allowedMinutes: 15,
      enabled: true,
      startTime: "16:00",
      endTime: "17:30",
      onePerDay: true,
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

const cleanMongooseFields = (object) => {
  delete object._id;
  delete object.__v;
  delete object.createdAt;
  delete object.updatedAt;
  return object;
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

  const currentObject = cleanMongooseFields(currentSettings.toObject());

  const currentWithDefaults = deepMerge(DEFAULT_SETTINGS, currentObject);

  const mergedSettings = deepMerge(currentWithDefaults, updates);

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

  const settingsObject = settings.toObject();

  const merged = deepMerge(DEFAULT_SETTINGS, settingsObject);

  return {
    breakfast: merged.breaks.breakfast,
    lunch: merged.breaks.lunch,
    tea: merged.breaks.tea,
  };
};

module.exports = {
  DEFAULT_SETTINGS,
  getSystemSettings,
  updateSystemSettings,
  resetSystemSettings,
  getBreakRulesFromSettings,
};