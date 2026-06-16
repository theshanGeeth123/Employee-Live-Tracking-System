import { useState } from "react";
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  UserCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

import DashboardShell from "../components/DashboardShell";
import DailyAttendanceReport from "../components/DailyAttendanceReport";
import NotificationsPanel from "../components/NotificationsPanel";
import ProfilePanel from "../components/ProfilePanel";

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  const [activeSection, setActiveSection] = useState("dashboard");

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      key: "attendance",
      label: "Attendance Report",
      icon: ClipboardList,
    },
    {
      key: "notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      key: "profile",
      label: "Profile",
      icon: UserCircle,
    },
  ];

  const renderContent = () => {
    if (activeSection === "dashboard") {
      return <DailyAttendanceReport />;
    }

    if (activeSection === "attendance") {
      return <DailyAttendanceReport />;
    }

    if (activeSection === "notifications") {
      return <NotificationsPanel />;
    }

    if (activeSection === "profile") {
      return <ProfilePanel />;
    }

    return <DailyAttendanceReport />;
  };

  return (
    <DashboardShell
      title="Manager Dashboard"
      subtitle="Monitor team attendance and notifications"
      navItems={navItems}
      activeKey={activeSection}
      onNavChange={setActiveSection}
      user={user}
      logout={logout}
      connected={connected}
    >
      {renderContent()}
    </DashboardShell>
  );
};

export default ManagerDashboard;