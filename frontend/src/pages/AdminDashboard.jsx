import { useState } from "react";
import {
  Bell,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  Settings,
  UserCircle,
  Users,
  Coffee,
  Video,
  ClipboardCheck,
  BarChart3 ,
} from "lucide-react";

import AdminBreakReport from "../components/AdminBreakReport";
import AdminMeetingPanel from "../components/AdminMeetingPanel";

import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

import DashboardShell from "../components/DashboardShell";
import DailyAttendanceReport from "../components/DailyAttendanceReport";
import AdminLeaveRequests from "../components/AdminLeaveRequests";
import NotificationsPanel from "../components/NotificationsPanel";
import AdminUserManagement from "../components/AdminUserManagement";
import SettingsPanel from "../components/SettingsPanel";
import ProfilePanel from "../components/ProfilePanel";
import TaskManagementPanel from "../components/TaskManagementPanel";
import ActivityReportsPanel from "../components/ActivityReportsPanel";

const AdminDashboard = () => {
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
      key: "leaves",
      label: "Leave Requests",
      icon: CalendarCheck,
    },
    {
      key: "notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      key: "users",
      label: "User Management",
      icon: Users,
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
      key: "tasks",
      label: "Tasks",
      icon: ClipboardCheck,
    },
    {
      key: "activityReports",
      label: "Activity Reports",
      icon: BarChart3,
    },
    {
      key: "settings",
      label: "Settings",
      icon: Settings,
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

    if (activeSection === "leaves") {
      return <AdminLeaveRequests />;
    }

    if (activeSection === "notifications") {
      return <NotificationsPanel />;
    }

    if (activeSection === "users") {
      return <AdminUserManagement />;
    }

    if (activeSection === "breaks") {
      return <AdminBreakReport />;
    }

    if (activeSection === "meetings") {
      return <AdminMeetingPanel />;
    }

    if (activeSection === "settings") {
      return <SettingsPanel />;
    }

    if (activeSection === "profile") {
      return <ProfilePanel />;
    }

    if (activeSection === "tasks") {
      return <TaskManagementPanel />;
    }
    if (activeSection === "activityReports") {
      return <ActivityReportsPanel />;
    }

    return <DailyAttendanceReport />;
  };

  return (
    <DashboardShell
      title="Admin Dashboard"
      subtitle="Manage attendance, users, leaves and system settings"
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

export default AdminDashboard;