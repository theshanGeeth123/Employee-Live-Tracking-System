import { useState } from "react";
import {
  Bell,
  CalendarCheck,
  LayoutDashboard,
  UserCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

import DashboardShell from "../components/DashboardShell";
import EmployeeActivityPanel from "../components/EmployeeActivityPanel";
import EmployeeLeavePanel from "../components/EmployeeLeavePanel";
import NotificationsPanel from "../components/NotificationsPanel";
import ProfilePanel from "../components/ProfilePanel";

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  const [activeSection, setActiveSection] = useState("dashboard");

  const navItems = [
    {
      key: "dashboard",
      label: "My Activity",
      icon: LayoutDashboard,
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
      key: "profile",
      label: "Profile",
      icon: UserCircle,
    },
  ];

  const renderContent = () => {
    if (activeSection === "dashboard") {
      return <EmployeeActivityPanel />;
    }

    if (activeSection === "leaves") {
      return <EmployeeLeavePanel />;
    }

    if (activeSection === "notifications") {
      return <NotificationsPanel />;
    }

    if (activeSection === "profile") {
      return <ProfilePanel />;
    }

    return <EmployeeActivityPanel />;
  };

  return (
    <DashboardShell
      title="Employee Dashboard"
      subtitle="Track your activity, breaks, leaves and notifications"
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

export default EmployeeDashboard;