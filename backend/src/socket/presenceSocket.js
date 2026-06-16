const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
    startOnlineSession,
    closeOnlineSession,
    updateHeartbeat,
} = require("../services/workSessionService");

const {
    createNotification,
    emitNotification,
} = require("../services/notificationService");

const connectedUsers = new Map();
const socketUserMap = new Map();
const offlineTimers = new Map();

const getOfflineGraceMs = () => {
    const seconds = Number(process.env.OFFLINE_GRACE_SECONDS || 10);
    return seconds * 1000;
};

const addSocketForUser = (userId, socketId) => {
    const id = userId.toString();

    if (!connectedUsers.has(id)) {
        connectedUsers.set(id, new Set());
    }

    connectedUsers.get(id).add(socketId);
    socketUserMap.set(socketId, id);
};

const removeSocketForUser = (socketId) => {
    const userId = socketUserMap.get(socketId);

    if (!userId) {
        return null;
    }

    const userSockets = connectedUsers.get(userId);

    if (userSockets) {
        userSockets.delete(socketId);

        if (userSockets.size === 0) {
            connectedUsers.delete(userId);
        }
    }

    socketUserMap.delete(socketId);

    return userId;
};

const isUserStillConnected = (userId) => {
    const sockets = connectedUsers.get(userId.toString());
    return sockets && sockets.size > 0;
};

const sanitizeUser = (user) => {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        accountStatus: user.accountStatus,
        presenceStatus: user.presenceStatus,
        lastSeenAt: user.lastSeenAt,
        lastLoginAt: user.lastLoginAt,
    };
};

const notifyAdmins = (io, eventName, payload) => {
    io.to("admins").emit(eventName, payload);
};

const setupPresenceSocket = (io) => {
    io.use(async (socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.split(" ")[1];

            if (!token) {
                return next(new Error("Authentication token missing"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id).select("-password");

            if (!user) {
                return next(new Error("User not found"));
            }

            if (user.accountStatus !== "active") {
                return next(new Error("Account is not active"));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error("Socket authentication failed"));
        }
    });

    io.on("connection", async (socket) => {
        const user = socket.user;
        const userId = user._id.toString();

        console.log(`Socket connected: ${socket.id} | ${user.name} | ${user.role}`);

        socket.join(`user:${userId}`);

        if (user.role === "admin") {
            socket.join("admins");

            socket.emit("presence:admin_connected", {
                success: true,
                message: "Admin connected to live presence system",
            });

            return;
        }

        if (user.role === "employee" || user.role === "manager") {
            if (offlineTimers.has(userId)) {
                clearTimeout(offlineTimers.get(userId));
                offlineTimers.delete(userId);
            }

            const wasAlreadyConnected = isUserStillConnected(userId);

            addSocketForUser(userId, socket.id);

            if (!wasAlreadyConnected) {
                await startOnlineSession({
                    employeeId: userId,
                    reason: user.lastSeenAt ? "reconnect" : "login",
                    now: new Date(),
                });
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    presenceStatus: "online",
                    lastSeenAt: new Date(),
                },
                { new: true }
            ).select("-password");

            notifyAdmins(io, "presence:user_online", {
                type: "USER_ONLINE",
                message: `${updatedUser.name} is now online`,
                user: sanitizeUser(updatedUser),
                time: new Date(),
            });

            notifyAdmins(io, "presence:user_updated", {
                user: sanitizeUser(updatedUser),
            });

            socket.emit("presence:connected", {
                success: true,
                message: "You are marked as online",
                user: sanitizeUser(updatedUser),
            });
        }

        socket.on("presence:heartbeat", async () => {
            try {
                if (user.role !== "employee" && user.role !== "manager") {
                    return;
                }

                const now = new Date();

                const dailySession = await updateHeartbeat({
                    employeeId: userId,
                    now,
                });

                const newPresenceStatus =
                    dailySession.currentStatus === "on_break" ? "on_break" : "online";

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    {
                        presenceStatus: newPresenceStatus,
                        lastSeenAt: now,
                    },
                    { new: true }
                ).select("-password");

                notifyAdmins(io, "presence:user_updated", {
                    user: sanitizeUser(updatedUser),
                });
            } catch (error) {
                console.error("Heartbeat update failed:", error.message);
            }
        });

        socket.on("disconnect", async (reason) => {
            console.log(`Socket disconnected: ${socket.id} | Reason: ${reason}`);

            if (user.role !== "employee" && user.role !== "manager") {
                return;
            }

            const disconnectedUserId = removeSocketForUser(socket.id);

            if (!disconnectedUserId) {
                return;
            }

            const timer = setTimeout(async () => {
                try {
                    if (isUserStillConnected(disconnectedUserId)) {
                        return;
                    }

                    const updatedUser = await User.findByIdAndUpdate(
                        disconnectedUserId,
                        {
                            presenceStatus: "offline",
                            lastSeenAt: new Date(),
                        },
                        { new: true }
                    ).select("-password");

                    await closeOnlineSession({
                        employeeId: disconnectedUserId,
                        reason: "disconnect",
                        now: new Date(),
                    });

                    if (!updatedUser) {
                        return;
                    }

                    notifyAdmins(io, "presence:user_offline", {
                        type: "USER_OFFLINE",
                        message: `${updatedUser.name} is now offline`,
                        user: sanitizeUser(updatedUser),
                        reason,
                        time: new Date(),
                    });

                    notifyAdmins(io, "presence:user_updated", {
                        user: sanitizeUser(updatedUser),
                    });

                    offlineTimers.delete(disconnectedUserId);
                } catch (error) {
                    console.error("Failed to mark user offline:", error.message);
                }
            }, getOfflineGraceMs());

            offlineTimers.set(disconnectedUserId, timer);
        });
    });
};

module.exports = setupPresenceSocket;