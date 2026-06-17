import { useState } from "react";
import {
  Bell,
  ClipboardList,
  Coffee,
  LayoutDashboard,
  UserCircle,
  Video,
  ClipboardCheck
} from "lucide-react";

import AdminBreakReport from "../components/AdminBreakReport";

import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

import DashboardShell from "../components/DashboardShell";
import DailyAttendanceReport from "../components/DailyAttendanceReport";
import NotificationsPanel from "../components/NotificationsPanel";
import ProfilePanel from "../components/ProfilePanel";
import UserMeetingPanel from "../components/UserMeetingPanel";
import TaskManagementPanel from "../components/TaskManagementPanel";

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
      key: "breaks",
      label: "Break Report",
      icon: Coffee,
    },
    {
      key: "meetings",
      label: "Meetings",
      icon: Video,
    },
    {
      key: "profile",
      label: "Profile",
      icon: UserCircle,
    },
    {
    key: "tasks",
    label: "Tasks",
    icon: ClipboardCheck,
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

    if (activeSection === "breaks") {
      return <AdminBreakReport />;
    }

    if (activeSection === "meetings") {
      return <UserMeetingPanel />;
    }

    if (activeSection === "profile") {
      return <ProfilePanel />;
    }

    if (activeSection === "tasks") {
      return <TaskManagementPanel />;
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