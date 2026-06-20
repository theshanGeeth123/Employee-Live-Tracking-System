const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

const User = require("./models/User");
const DailyWorkSession = require("./models/DailyWorkSession");
const SessionLog = require("./models/SessionLog");

const authRoutes = require("./routes/authRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const userRoutes = require("./routes/userRoutes");
const presenceRoutes = require("./routes/presenceRoutes");
const workSessionRoutes = require("./routes/workSessionRoutes");
const breakRoutes = require("./routes/breakRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const attendanceSummaryRoutes = require("./routes/attendanceSummaryRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const taskRoutes = require("./routes/taskRoutes");
const attendanceAdvancedRoutes = require("./routes/attendanceAdvancedRoutes");

const setupPresenceSocket = require("./socket/presenceSocket");

const { getDurationInSeconds } = require("./utils/dateHelper");

// Load environment variables
dotenv.config();

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

// IMPORTANT: Make Socket.IO available inside controllers
app.set("io", io);

// Socket.IO setup
setupPresenceSocket(io);

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Test route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Employee Live Tracking Backend is running",
  });
});

// API health route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminUserRoutes);
app.use("/api/users", userRoutes);
app.use("/api/presence", presenceRoutes);
app.use("/api/work-sessions", workSessionRoutes);
app.use("/api/breaks", breakRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/attendance-summary", attendanceSummaryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/attendance-advanced", attendanceAdvancedRoutes);

// 404 route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5000;

const closeOpenWorkSessionLogs = async () => {
  const now = new Date();

  const openLogs = await SessionLog.find({ isOpen: true });

  for (const log of openLogs) {
    const durationSeconds = getDurationInSeconds(log.startTime, now);

    log.endTime = now;
    log.durationSeconds = durationSeconds;
    log.endReason = "server_restart";
    log.isOpen = false;

    await log.save();

    const dailySession = await DailyWorkSession.findById(log.dailySession);

    if (dailySession) {
      dailySession.totalOnlineSeconds += durationSeconds;

      dailySession.totalActiveSeconds =
        dailySession.totalOnlineSeconds -
        dailySession.totalBreakSeconds -
        dailySession.totalIdleSeconds;

      if (dailySession.totalActiveSeconds < 0) {
        dailySession.totalActiveSeconds = 0;
      }

      dailySession.currentStatus = "offline";
      dailySession.lastSeenAt = now;
      dailySession.activeSegmentStartedAt = null;

      await dailySession.save();
    }
  }

  console.log("Open work session logs closed");
};

const resetPresenceStatuses = async () => {
  await User.updateMany(
    { presenceStatus: { $ne: "offline" } },
    {
      presenceStatus: "offline",
      lastSeenAt: new Date(),
    }
  );

  console.log("Presence statuses reset to offline");
};

const startServer = async () => {
  try {
    await connectDB();

    await closeOpenWorkSessionLogs();

    await resetPresenceStatuses();

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Client URL: ${process.env.CLIENT_URL || "http://localhost:5173"}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();