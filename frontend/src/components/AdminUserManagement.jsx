import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus, RefreshCcw, Search } from "lucide-react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";

const statusBadge = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-red-100 text-red-700",
  resigned: "bg-slate-100 text-slate-700",
};

const roleBadge = {
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  employee: "bg-slate-100 text-slate-700",
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  phone: "",
  department: "",
  position: "",
};

const AdminUserManagement = () => {
  const { user: loggedUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setError("");

      const response = await API.get("/admin/users");

      setUsers(response.data.users || []);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.email?.toLowerCase().includes(search) ||
        item.department?.toLowerCase().includes(search) ||
        item.position?.toLowerCase().includes(search);

      const matchesRole = roleFilter === "all" || item.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" || item.accountStatus === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((item) => item.role === "admin").length,
      managers: users.filter((item) => item.role === "manager").length,
      employees: users.filter((item) => item.role === "employee").length,
      active: users.filter((item) => item.accountStatus === "active").length,
      suspended: users.filter((item) => item.accountStatus === "suspended")
        .length,
    };
  }, [users]);

  const handleChange = (e) => {
    setMessage("");
    setError("");

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const createUser = async (e) => {
    e.preventDefault();

    try {
      setCreating(true);
      setMessage("");
      setError("");

      const response = await API.post("/admin/users", formData);

      setMessage(response.data.message || "User created successfully");
      setFormData(emptyForm);

      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const updateUserStatus = async (id, accountStatus) => {
    try {
      setMessage("");
      setError("");

      const response = await API.patch(`/admin/users/${id}/status`, {
        accountStatus,
      });

      setMessage(response.data.message || "User status updated");

      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            User Management
          </h2>
          <p className="text-sm text-slate-500">
            Create users and manage account status
          </p>
        </div>

        <button
          onClick={fetchUsers}
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

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total</p>
          <h3 className="text-2xl font-bold">{stats.total}</h3>
        </div>

        <div className="rounded-xl bg-purple-50 p-4">
          <p className="text-xs text-slate-500">Admins</p>
          <h3 className="text-2xl font-bold text-purple-700">
            {stats.admins}
          </h3>
        </div>

        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-xs text-slate-500">Managers</p>
          <h3 className="text-2xl font-bold text-blue-700">
            {stats.managers}
          </h3>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Employees</p>
          <h3 className="text-2xl font-bold">{stats.employees}</h3>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs text-slate-500">Active</p>
          <h3 className="text-2xl font-bold text-emerald-700">
            {stats.active}
          </h3>
        </div>

        <div className="rounded-xl bg-red-50 p-4">
          <p className="text-xs text-slate-500">Suspended</p>
          <h3 className="text-2xl font-bold text-red-700">
            {stats.suspended}
          </h3>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus size={18} className="text-slate-700" />
          <h3 className="font-semibold text-slate-900">Create New User</h3>
        </div>

        <form
          onSubmit={createUser}
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              placeholder="Employee name"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              placeholder="employee@gmail.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              placeholder="123456"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Phone
            </label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              placeholder="0712345678"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Department
            </label>
            <input
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              placeholder="IT"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Position
            </label>
            <input
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              placeholder="Developer"
            />
          </div>

          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {creating ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search user..."
            className="w-full rounded-lg border border-slate-300 py-3 pl-9 pr-4 text-sm"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-4 py-3 text-sm"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-4 py-3 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="resigned">Resigned</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Presence</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((item) => {
                  const isMe =
                    item._id === loggedUser?.id ||
                    item._id === loggedUser?._id;

                  return (
                    <tr key={item._id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {item.name}
                          {isMe && (
                            <span className="ml-2 text-xs text-blue-600">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.email}
                        </div>
                        {item.phone && (
                          <div className="text-xs text-slate-400">
                            {item.phone}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            roleBadge[item.role] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.role}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {item.department || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {item.position || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            statusBadge[item.accountStatus] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.accountStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {item.presenceStatus || "offline"}
                      </td>

                      <td className="px-4 py-3">
                        {isMe ? (
                          <span className="text-xs text-slate-400">
                            Current user
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {item.accountStatus !== "active" && (
                              <button
                                onClick={() =>
                                  updateUserStatus(item._id, "active")
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                Activate
                              </button>
                            )}

                            {item.accountStatus !== "suspended" && (
                              <button
                                onClick={() =>
                                  updateUserStatus(item._id, "suspended")
                                }
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                Suspend
                              </button>
                            )}

                            {item.accountStatus !== "resigned" && (
                              <button
                                onClick={() =>
                                  updateUserStatus(item._id, "resigned")
                                }
                                className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                Resign
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                No users found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserManagement;