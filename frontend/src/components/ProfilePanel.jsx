import { useEffect, useState } from "react";
import { User, Lock, RefreshCcw } from "lucide-react";
import API from "../api/axios";

const ProfilePanel = () => {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "",
    phone: "",
    department: "",
    position: "",
    accountStatus: "",
    presenceStatus: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    try {
      setError("");

      const response = await API.get("/users/profile");

      const userData = response.data.user;

      setProfile({
        name: userData.name || "",
        email: userData.email || "",
        role: userData.role || "",
        phone: userData.phone || "",
        department: userData.department || "",
        position: userData.position || "",
        accountStatus: userData.accountStatus || "",
        presenceStatus: userData.presenceStatus || "",
      });

      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileChange = (e) => {
    setMessage("");
    setError("");

    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setMessage("");
    setError("");

    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const updateProfile = async (e) => {
    e.preventDefault();

    try {
      setUpdatingProfile(true);
      setMessage("");
      setError("");

      const response = await API.put("/users/profile", {
        name: profile.name,
        phone: profile.phone,
        department: profile.department,
        position: profile.position,
      });

      setMessage(response.data.message || "Profile updated successfully");

      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      fetchProfile();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }

    try {
      setChangingPassword(true);
      setMessage("");
      setError("");

      const response = await API.put("/users/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setMessage(response.data.message || "Password changed successfully");

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setError(error.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <User size={20} className="text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">
              My Profile
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Update your personal details and password
          </p>
        </div>

        <button
          onClick={fetchProfile}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={updateProfile}
          className="rounded-2xl border border-slate-200 p-5"
        >
          <h3 className="mb-4 font-semibold text-slate-900">
            Profile Details
          </h3>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                name="name"
                value={profile.name}
                onChange={handleProfileChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                value={profile.email}
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-400">
                Email cannot be changed from profile.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Role
                </label>
                <input
                  value={profile.role}
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Account Status
                </label>
                <input
                  value={profile.accountStatus}
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                name="phone"
                value={profile.phone}
                onChange={handleProfileChange}
                placeholder="0712345678"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Department
              </label>
              <input
                name="department"
                value={profile.department}
                onChange={handleProfileChange}
                placeholder="IT"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Position
              </label>
              <input
                name="position"
                value={profile.position}
                onChange={handleProfileChange}
                placeholder="Developer"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={updatingProfile}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {updatingProfile ? "Updating..." : "Update Profile"}
            </button>
          </div>
        </form>

        <form
          onSubmit={changePassword}
          className="rounded-2xl border border-slate-200 p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Lock size={18} className="text-slate-700" />
            <h3 className="font-semibold text-slate-900">
              Change Password
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>

          <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-700">
            After changing password, use the new password for your next login.
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePanel;