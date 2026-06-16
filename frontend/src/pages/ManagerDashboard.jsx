import { useAuth } from "../context/AuthContext";

const ManagerDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Manager Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Welcome, {user?.name}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Logout
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Team Overview</h2>
          <p className="mt-2 text-sm text-slate-500">
            Manager dashboard details next parts වලදී add කරනවා.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;