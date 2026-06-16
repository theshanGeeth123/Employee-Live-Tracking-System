import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";

const DashboardShell = ({
  title,
  subtitle,
  navItems,
  activeKey,
  onNavChange,
  user,
  logout,
  connected,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (key) => {
    onNavChange(key);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="border-b border-slate-800 p-6">
        <h1 className="text-lg font-bold">Live Attendance</h1>
        <p className="mt-1 text-xs text-slate-400">
          Employee Tracking System
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;

            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-4 rounded-xl bg-slate-900 p-4">
          <p className="text-sm font-semibold text-white">{user?.name}</p>
          <p className="text-xs text-slate-400">{user?.email}</p>
          <p className="mt-2 inline-block rounded-full bg-slate-800 px-3 py-1 text-xs capitalize text-slate-300">
            {user?.role}
          </p>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="relative h-full w-72">
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="lg:ml-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-200 p-2 lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div>
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                <p className="text-sm text-slate-500">{subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {connected !== undefined && (
                <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold md:block">
                  Socket:{" "}
                  <span
                    className={
                      connected ? "text-emerald-600" : "text-red-600"
                    }
                  >
                    {connected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              )}

              <button
                onClick={logout}
                className="hidden rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 md:block"
              >
                Logout
              </button>

              <button
                onClick={() => setMobileOpen(false)}
                className="hidden rounded-lg border border-slate-200 p-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </header>

        <section className="p-4 md:p-6">{children}</section>
      </main>
    </div>
  );
};

export default DashboardShell;