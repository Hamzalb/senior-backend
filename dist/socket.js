"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitMessageRead = exports.emitStopTyping = exports.emitTyping = exports.emitMessage = exports.emitUnreadCount = exports.emitNotification = exports.getOnlineUsers = exports.isUserOnline = exports.getIO = exports.initSocket = void 0;
// socket.ts
const socket_io_1 = require("socket.io");
let io;
// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map();
// Initialize Socket.io server
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin)
                    return callback(null, true);
                const allowed = [
                    "http://localhost:3000",
                    "http://localhost:5050",
                    "https://senior-frontend-eta.vercel.app",
                    process.env.FRONTEND_URL || "https://senior-frontend-eta.vercel.app",
                ];
                const isLocalNetwork = /^http:\/\/(192\.168\.|10\.)[\d.]+:\d+$/.test(origin);
                if (allowed.includes(origin) || isLocalNetwork) {
                    callback(null, true);
                }
                else {
                    callback(new Error(`Socket CORS: origin ${origin} not allowed`));
                }
            },
            methods: ["GET", "POST"],
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);
        // User joins their personal room for targeted notifications
        socket.on("join", (userId) => {
            socket.join(`user:${userId}`);
            socket.data.userId = userId; // Store userId in socket data
            // Track online status
            if (!onlineUsers.has(userId)) {
                onlineUsers.set(userId, new Set());
            }
            onlineUsers.get(userId).add(socket.id);
            // Broadcast online status to all users
            io.emit("user-online", userId);
            console.log(`User ${userId} joined their notification room (online: ${onlineUsers.size} users)`);
        });
        // User leaves their room (on logout, etc.)
        socket.on("leave", (userId) => {
            socket.leave(`user:${userId}`);
            // Remove from online tracking
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    // Broadcast offline status
                    io.emit("user-offline", userId);
                }
            }
            console.log(`User ${userId} left their notification room`);
        });
        // Handle typing events
        socket.on("typing", (data) => {
            io.to(`user:${data.toUserId}`).emit("typing", { fromUserId: data.fromUserId });
        });
        socket.on("stop-typing", (data) => {
            io.to(`user:${data.toUserId}`).emit("stop-typing", { fromUserId: data.fromUserId });
        });
        // Handle message read events
        socket.on("mark-read", async (data) => {
            // Emit to the sender that their messages were read
            io.to(`user:${data.conversationUserId}`).emit("messages-read", {
                byUserId: data.currentUserId,
                timestamp: new Date().toISOString(),
            });
        });
        // Get online users list
        socket.on("get-online-users", () => {
            const onlineUserIds = Array.from(onlineUsers.keys());
            socket.emit("online-users", onlineUserIds);
        });
        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
            // Clean up online status
            const userId = socket.data.userId;
            if (userId) {
                const userSockets = onlineUsers.get(userId);
                if (userSockets) {
                    userSockets.delete(socket.id);
                    if (userSockets.size === 0) {
                        onlineUsers.delete(userId);
                        // Broadcast offline status
                        io.emit("user-offline", userId);
                        console.log(`User ${userId} is now offline`);
                    }
                }
            }
        });
    });
    return io;
};
exports.initSocket = initSocket;
// Get the io instance
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};
exports.getIO = getIO;
// Check if a user is online
const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
};
exports.isUserOnline = isUserOnline;
// Get all online users
const getOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
};
exports.getOnlineUsers = getOnlineUsers;
// Emit a notification to a specific user
const emitNotification = (userId, notification) => {
    if (io) {
        io.to(`user:${userId}`).emit("notification", notification);
        console.log(`Notification emitted to user:${userId}`);
    }
};
exports.emitNotification = emitNotification;
// Emit unread count update to a specific user
const emitUnreadCount = (userId, count) => {
    if (io) {
        io.to(`user:${userId}`).emit("unread-count", count);
        console.log(`Unread count ${count} emitted to user:${userId}`);
    }
};
exports.emitUnreadCount = emitUnreadCount;
// Emit a new message to a specific user
const emitMessage = (userId, message) => {
    if (io) {
        io.to(`user:${userId}`).emit("new-message", message);
        console.log(`Message emitted to user:${userId}`);
    }
};
exports.emitMessage = emitMessage;
// Emit typing indicator to a specific user
const emitTyping = (userId, fromUserId) => {
    if (io) {
        io.to(`user:${userId}`).emit("typing", { fromUserId });
    }
};
exports.emitTyping = emitTyping;
// Emit stop typing indicator to a specific user
const emitStopTyping = (userId, fromUserId) => {
    if (io) {
        io.to(`user:${userId}`).emit("stop-typing", { fromUserId });
    }
};
exports.emitStopTyping = emitStopTyping;
// Emit message read receipt
const emitMessageRead = (userId, byUserId) => {
    if (io) {
        io.to(`user:${userId}`).emit("messages-read", {
            byUserId,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.emitMessageRead = emitMessageRead;
