import { useEffect, useState } from "react";
import { Settings, RefreshCcw, RotateCcw, Save } from "lucide-react";
import API from "../api/axios";

const defaultForm = {
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

const SettingsPanel = () => {
  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchSettings = async () => {
    try {
      setError("");

      const response = await API.get("/settings");
      const settings = response.data.settings || {};

      setFormData({
        breaks: {
          breakfast: {
            label: settings.breaks?.breakfast?.label || "Breakfast",
            allowedMinutes:
              settings.breaks?.breakfast?.allowedMinutes ?? 30,
            enabled: settings.breaks?.breakfast?.enabled ?? true,
            startTime: settings.breaks?.breakfast?.startTime || "08:30",
            endTime: settings.breaks?.breakfast?.endTime || "10:30",
            onePerDay: settings.breaks?.breakfast?.onePerDay ?? true,
          },
          lunch: {
            label: settings.breaks?.lunch?.label || "Lunch",
            allowedMinutes: settings.breaks?.lunch?.allowedMinutes ?? 60,
            enabled: settings.breaks?.lunch?.enabled ?? true,
            startTime: settings.breaks?.lunch?.startTime || "12:00",
            endTime: settings.breaks?.lunch?.endTime || "14:30",
            onePerDay: settings.breaks?.lunch?.onePerDay ?? true,
          },
          tea: {
            label: settings.breaks?.tea?.label || "Tea",
            allowedMinutes: settings.breaks?.tea?.allowedMinutes ?? 15,
            enabled: settings.breaks?.tea?.enabled ?? true,
            startTime: settings.breaks?.tea?.startTime || "16:00",
            endTime: settings.breaks?.tea?.endTime || "17:30",
            onePerDay: settings.breaks?.tea?.onePerDay ?? true,
          },
        },
        presence: {
          offlineGraceSeconds:
            settings.presence?.offlineGraceSeconds ?? 10,
          heartbeatIntervalSeconds:
            settings.presence?.heartbeatIntervalSeconds ?? 20,
          idleTimeoutMinutes: settings.presence?.idleTimeoutMinutes ?? 10,
        },
        office: {
          timezone: settings.office?.timezone || "Asia/Colombo",
          startTime: settings.office?.startTime || "08:30",
          endTime: settings.office?.endTime || "17:00",
        },
        leave: {
          allowEmergencyPastDate:
            settings.leave?.allowEmergencyPastDate ?? true,
        },
      });
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleBreakChange = (breakType, field, value) => {
    setMessage("");
    setError("");

    setFormData((prev) => ({
      ...prev,
      breaks: {
        ...prev.breaks,
        [breakType]: {
          ...prev.breaks[breakType],
          [field]: value,
        },
      },
    }));
  };

  const handlePresenceChange = (field, value) => {
    setMessage("");
    setError("");

    setFormData((prev) => ({
      ...prev,
      presence: {
        ...prev.presence,
        [field]: value,
      },
    }));
  };

  const handleOfficeChange = (field, value) => {
    setMessage("");
    setError("");

    setFormData((prev) => ({
      ...prev,
      office: {
        ...prev.office,
        [field]: value,
      },
    }));
  };

  const handleLeaveChange = (field, value) => {
    setMessage("");
    setError("");

    setFormData((prev) => ({
      ...prev,
      leave: {
        ...prev.leave,
        [field]: value,
      },
    }));
  };

  const validateBreakTimes = () => {
    const breakTypes = ["breakfast", "lunch", "tea"];

    for (const breakType of breakTypes) {
      const item = formData.breaks[breakType];

      if (!item.startTime || !item.endTime) {
        return `${item.label} start time and end time are required`;
      }

      if (!item.allowedMinutes || Number(item.allowedMinutes) < 1) {
        return `${item.label} allowed minutes must be at least 1`;
      }
    }

    return null;
  };

  const saveSettings = async (e) => {
    e.preventDefault();

    const validationError = validateBreakTimes();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const payload = {
        breaks: {
          breakfast: {
            label: formData.breaks.breakfast.label,
            allowedMinutes: Number(formData.breaks.breakfast.allowedMinutes),
            enabled: Boolean(formData.breaks.breakfast.enabled),
            startTime: formData.breaks.breakfast.startTime,
            endTime: formData.breaks.breakfast.endTime,
            onePerDay: Boolean(formData.breaks.breakfast.onePerDay),
          },
          lunch: {
            label: formData.breaks.lunch.label,
            allowedMinutes: Number(formData.breaks.lunch.allowedMinutes),
            enabled: Boolean(formData.breaks.lunch.enabled),
            startTime: formData.breaks.lunch.startTime,
            endTime: formData.breaks.lunch.endTime,
            onePerDay: Boolean(formData.breaks.lunch.onePerDay),
          },
          tea: {
            label: formData.breaks.tea.label,
            allowedMinutes: Number(formData.breaks.tea.allowedMinutes),
            enabled: Boolean(formData.breaks.tea.enabled),
            startTime: formData.breaks.tea.startTime,
            endTime: formData.breaks.tea.endTime,
            onePerDay: Boolean(formData.breaks.tea.onePerDay),
          },
        },
        presence: {
          offlineGraceSeconds: Number(
            formData.presence.offlineGraceSeconds
          ),
          heartbeatIntervalSeconds: Number(
            formData.presence.heartbeatIntervalSeconds
          ),
          idleTimeoutMinutes: Number(formData.presence.idleTimeoutMinutes),
        },
        office: {
          timezone: formData.office.timezone,
          startTime: formData.office.startTime,
          endTime: formData.office.endTime,
        },
        leave: {
          allowEmergencyPastDate: Boolean(
            formData.leave.allowEmergencyPastDate
          ),
        },
      };

      const response = await API.put("/settings", payload);

      setMessage(response.data.message || "Settings updated successfully");
      await fetchSettings();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all settings to default?"
    );

    if (!confirmed) return;

    try {
      setResetting(true);
      setMessage("");
      setError("");

      const response = await API.post("/settings/reset");

      setMessage(response.data.message || "Settings reset successfully");
      await fetchSettings();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to reset settings");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">
              System Settings
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Manage break rules, allowed time windows, presence timeout and
            office time
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchSettings}
            type="button"
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>

          <button
            onClick={resetSettings}
            type="button"
            disabled={resetting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
          >
            <RotateCcw size={16} />
            {resetting ? "Resetting..." : "Reset"}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={saveSettings} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="mb-4 font-semibold text-slate-900">
            Break Settings
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {["breakfast", "lunch", "tea"].map((breakType) => (
              <div
                key={breakType}
                className="rounded-xl border border-slate-200 p-4"
              >
                <label className="mb-1 block text-sm font-medium text-slate-700 capitalize">
                  {breakType} Label
                </label>

                <input
                  value={formData.breaks[breakType].label}
                  onChange={(e) =>
                    handleBreakChange(breakType, "label", e.target.value)
                  }
                  className="mb-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                  required
                />

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Allowed Minutes
                </label>

                <input
                  type="number"
                  min="1"
                  max="300"
                  value={formData.breaks[breakType].allowedMinutes}
                  onChange={(e) =>
                    handleBreakChange(
                      breakType,
                      "allowedMinutes",
                      e.target.value
                    )
                  }
                  className="mb-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                  required
                />

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Start Time
                </label>

                <input
                  type="time"
                  value={formData.breaks[breakType].startTime}
                  onChange={(e) =>
                    handleBreakChange(breakType, "startTime", e.target.value)
                  }
                  className="mb-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                  required
                />

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  End Time
                </label>

                <input
                  type="time"
                  value={formData.breaks[breakType].endTime}
                  onChange={(e) =>
                    handleBreakChange(breakType, "endTime", e.target.value)
                  }
                  className="mb-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                  required
                />

                <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.breaks[breakType].onePerDay}
                    onChange={(e) =>
                      handleBreakChange(
                        breakType,
                        "onePerDay",
                        e.target.checked
                      )
                    }
                  />
                  One time per day
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.breaks[breakType].enabled}
                    onChange={(e) =>
                      handleBreakChange(
                        breakType,
                        "enabled",
                        e.target.checked
                      )
                    }
                  />
                  Enabled
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="mb-4 font-semibold text-slate-900">
            Presence Settings
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Offline Grace Seconds
              </label>

              <input
                type="number"
                min="1"
                max="600"
                value={formData.presence.offlineGraceSeconds}
                onChange={(e) =>
                  handlePresenceChange(
                    "offlineGraceSeconds",
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                required
              />

              <p className="mt-1 text-xs text-slate-400">
                User becomes offline after this delay.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Heartbeat Interval Seconds
              </label>

              <input
                type="number"
                min="5"
                max="300"
                value={formData.presence.heartbeatIntervalSeconds}
                onChange={(e) =>
                  handlePresenceChange(
                    "heartbeatIntervalSeconds",
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                required
              />

              <p className="mt-1 text-xs text-slate-400">
                Frontend sends active signal repeatedly.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Idle Timeout Minutes
              </label>

              <input
                type="number"
                min="1"
                max="480"
                value={formData.presence.idleTimeoutMinutes}
                onChange={(e) =>
                  handlePresenceChange("idleTimeoutMinutes", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                required
              />

              <p className="mt-1 text-xs text-slate-400">
                Later we can use this for idle tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="mb-4 font-semibold text-slate-900">
            Office Settings
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Timezone
              </label>

              <input
                value={formData.office.timezone}
                onChange={(e) =>
                  handleOfficeChange("timezone", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                placeholder="Asia/Colombo"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Office Start Time
              </label>

              <input
                type="time"
                value={formData.office.startTime}
                onChange={(e) =>
                  handleOfficeChange("startTime", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Office End Time
              </label>

              <input
                type="time"
                value={formData.office.endTime}
                onChange={(e) =>
                  handleOfficeChange("endTime", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                required
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="mb-4 font-semibold text-slate-900">
            Leave Settings
          </h3>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={formData.leave.allowEmergencyPastDate}
              onChange={(e) =>
                handleLeaveChange("allowEmergencyPastDate", e.target.checked)
              }
            />
            Allow emergency leave for past dates
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          <Save size={18} />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
};

export default SettingsPanel;