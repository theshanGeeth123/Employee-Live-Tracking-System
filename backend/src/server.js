const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const User = require("./models/User");

const authRoutes = require("./routes/authRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const userRoutes = require("./routes/userRoutes");
const presenceRoutes = require("./routes/presenceRoutes");

const setupPresenceSocket = require("./socket/presenceSocket");

// Load environment variables
dotenv.config();

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

// Socket.IO setup
setupPresenceSocket(io);

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Make io available in controllers if needed later
app.set("io", io);

// Test route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Employee Live Tracking Backend is running",
  });
});

// API test route
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

// 404 route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Server restart වුණොත් old online statuses offline කරන්න
  await User.updateMany(
    { presenceStatus: { $ne: "offline" } },
    {
      presenceStatus: "offline",
      lastSeenAt: new Date(),
    }
  );

  console.log("Presence statuses reset to offline");

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();