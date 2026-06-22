import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  XCircle,
} from "lucide-react";
import {
  approveAdminUser,
  changeAdminUserStatus,
  getAdminUserDetails,
  getAdminUsers,
  removeAdminUser,
  updateAdminUserRolePosition,
} from "../api/adminUserControlApi";

const statusClass = {
  pending: "bg-yellow-100 text-yellow-700",
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-red-100 text-red-700",
  resigned: "bg-slate-100 text-slate-700",
};

const roleClass = {
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  employee: "bg-slate-100 text-slate-700",
};

const formatDateTime = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const emptyForm = {
  role: "employee",
  department: "",
  position: "",
  phone: "",
};

const AdminUserControlPanel = () => {
  const [filters, setFilters] = useState({
    status: "all",
    role: "all",
    search: "",
  });

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedUser = useMemo(() => {
    return users.find((user) => user._id === selectedUserId) || null;
  }, [users, selectedUserId]);

  const pendingCount = useMemo(() => {
    return users.filter((user) => user.accountStatus === "pending").length;
  }, [users]);

  const activeCount = useMemo(() => {
    return users.filter((user) => user.accountStatus === "active").length;
  }, [users]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminUsers(filters);

      setUsers(data.users || []);

      if (data.users?.length) {
        setSelectedUserId((previous) => {
          const stillExists = data.users.some((user) => user._id === previous);
          return stillExists ? previous : data.users[0]._id;
        });
      } else {
        setSelectedUserId("");
        setSelectedUserDetails(null);
        setForm(emptyForm);
      }
    } catch (error) {
      setError(
        error.response?.data?.message || error.message || "Failed to load users"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadUserDetails = useCallback(async () => {
    if (!selectedUserId) return;

    try {
      setDetailsLoading(true);
      setError("");

      const data = await getAdminUserDetails(selectedUserId);
      const user = data.user;

      setSelectedUserDetails(user);

      setForm({
        role: user?.role || "employee",
        department: user?.department || "",
        position: user?.position || "",
        phone: user?.phone || "",
      });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to load user details"
      );
    } finally {
      setDetailsLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadUserDetails();
  }, [loadUserDetails]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleApprove = async () => {
    if (!selectedUserId) return;

    try {
      setActionLoading("approve");
      setError("");
      setSuccess("");

      const data = await approveAdminUser(selectedUserId, {
        role: form.role,
        department: form.department,
        position: form.position,
      });

      setSuccess(data.message || "User approved successfully");
      await loadUsers();
      await loadUserDetails();
    } catch (error) {
      setError(
        error.response?.data?.message || error.message || "Failed to approve user"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedUserId) return;

    try {
      setActionLoading("save");
      setError("");
      setSuccess("");

      const data = await updateAdminUserRolePosition(selectedUserId, {
        role: form.role,
        department: form.department,
        position: form.position,
        phone: form.phone,
      });

      setSuccess(data.message || "User details updated successfully");
      await loadUsers();
      await loadUserDetails();
    } catch (error) {
      setError(
        error.response?.data?.message || error.message || "Failed to update user"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleStatusChange = async (accountStatus) => {
    if (!selectedUserId) return;

    try {
      setActionLoading(accountStatus);
      setError("");
      setSuccess("");

      const data = await changeAdminUserStatus(selectedUserId, accountStatus);

      setSuccess(data.message || "User status updated successfully");
      await loadUsers();
      await loadUserDetails();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to update status"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleRemoveUser = async () => {
    if (!selectedUserId) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this user? This will hide the user from active system access."
    );

    if (!confirmed) return;

    try {
      setActionLoading("remove");
      setError("");
      setSuccess("");

      const data = await removeAdminUser(selectedUserId);

      setSuccess(data.message || "User removed successfully");
      setSelectedUserId("");
      setSelectedUserDetails(null);
      await loadUsers();
    } catch (error) {
      setError(
        error.response?.data?.message || error.message || "Failed to remove user"
      );
    } finally {
      setActionLoading("");
    }
  };

  const visibleDetails = selectedUserDetails || selectedUser;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              User Control
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Approve registered users, view safe user details, update role,
              department, position, phone, and manage account status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw size={16} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {success && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Total Users</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              {users.length}
            </h3>
          </div>

          <div className="rounded-xl bg-yellow-50 p-4">
            <p className="text-xs text-slate-500">Pending Approval</p>
            <h3 className="mt-1 text-2xl font-bold text-yellow-700">
              {pendingCount}
            </h3>
          </div>

          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-xs text-slate-500">Active</p>
            <h3 className="mt-1 text-2xl font-bold text-emerald-700">
              {activeCount}
            </h3>
          </div>

          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs text-slate-500">Selected</p>
            <h3 className="mt-1 truncate text-lg font-bold text-blue-700">
              {visibleDetails?.name || "-"}
            </h3>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
              <Search size={14} /> Search
            </label>

            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name, email, department, position..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Status
            </label>

            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="resigned">Resigned</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Role
            </label>

            <select
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="admin">Admins</option>
              <option value="manager">Managers</option>
              <option value="employee">Employees</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((item) => (
                    <tr
                      key={item._id}
                      onClick={() => setSelectedUserId(item._id)}
                      className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${
                        selectedUserId === item._id ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.name}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                              {item.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                          )}

                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.name || "-"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.email || "-"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            roleClass[item.role] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.role}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            statusClass[item.accountStatus] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.accountStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {item.department || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {item.position || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-600 capitalize">
                        {item.authProvider || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {!visibleDetails ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Select a user to view details and manage access.
            </div>
          ) : (
            <div>
              <div className="mb-5 flex items-start gap-3">
                {visibleDetails.avatar ? (
                  <img
                    src={visibleDetails.avatar}
                    alt={visibleDetails.name}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-600">
                    {visibleDetails.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-slate-900">
                    {visibleDetails.name}
                  </h3>

                  <p className="truncate text-sm text-slate-500">
                    {visibleDetails.email}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        roleClass[visibleDetails.role] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {visibleDetails.role}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        statusClass[visibleDetails.accountStatus] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {visibleDetails.accountStatus}
                    </span>
                  </div>
                </div>
              </div>

              {detailsLoading && (
                <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                  Loading selected user details...
                </div>
              )}

              <div className="mb-5 grid gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Safe Details
                  </p>

                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <p>Phone: {visibleDetails.phone || "-"}</p>
                    <p>Provider: {visibleDetails.authProvider || "-"}</p>
                    <p>Email Verified: {visibleDetails.emailVerified ? "Yes" : "No"}</p>
                    <p>Presence: {visibleDetails.presenceStatus || "-"}</p>
                    <p>Last Login: {formatDateTime(visibleDetails.lastLoginAt)}</p>
                    <p>Created: {formatDateTime(visibleDetails.createdAt)}</p>
                    <p>Approved: {formatDateTime(visibleDetails.approvedAt)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-5 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Role
                  </label>

                  <select
                    name="role"
                    value={form.role}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Department
                  </label>

                  <input
                    type="text"
                    name="department"
                    value={form.department}
                    onChange={handleFormChange}
                    placeholder="Example: IT Department"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Position
                  </label>

                  <input
                    type="text"
                    name="position"
                    value={form.position}
                    onChange={handleFormChange}
                    placeholder="Example: Software Engineer"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Phone
                  </label>

                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="Phone number"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {visibleDetails.accountStatus === "pending" && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={Boolean(actionLoading)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} />
                    {actionLoading === "approve" ? "Approving..." : "Approve User"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={Boolean(actionLoading)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save size={16} />
                  {actionLoading === "save" ? "Saving..." : "Save Role / Position"}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange("active")}
                    disabled={Boolean(actionLoading)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    <ShieldCheck size={16} />
                    Active
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange("suspended")}
                    disabled={Boolean(actionLoading)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    <XCircle size={16} />
                    Suspend
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange("resigned")}
                    disabled={Boolean(actionLoading)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                  >
                    <UserCog size={16} />
                    Resigned
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveUser}
                    disabled={Boolean(actionLoading)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>

                <button
                  type="button"
                  onClick={loadUserDetails}
                  disabled={detailsLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <Eye size={16} />
                  View Latest Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserControlPanel;