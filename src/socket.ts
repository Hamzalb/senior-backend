// socket.ts
import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

let io: Server;

// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map<string, Set<string>>();

// Initialize Socket.io server
export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = [
          "http://localhost:3000",
          "http://localhost:5050",
          "https://senior-frontend-eta.vercel.app",
          process.env.FRONTEND_URL || "https://senior-frontend-eta.vercel.app",
        ];
        const isLocalNetwork = /^http:\/\/(192\.168\.|10\.)[\d.]+:\d+$/.test(origin);
        if (allowed.includes(origin) || isLocalNetwork) {
          callback(null, true);
        } else {
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
    socket.on("join", (userId: string) => {
      socket.join(`user:${userId}`);
      socket.data.userId = userId; // Store userId in socket data
      
      // Track online status
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(socket.id);
      
      // Broadcast online status to all users
      io.emit("user-online", userId);
      console.log(`User ${userId} joined their notification room (online: ${onlineUsers.size} users)`);
    });

    // User leaves their room (on logout, etc.)
    socket.on("leave", (userId: string) => {
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
    socket.on("typing", (data: { toUserId: string; fromUserId: string }) => {
      io.to(`user:${data.toUserId}`).emit("typing", { fromUserId: data.fromUserId });
    });

    socket.on("stop-typing", (data: { toUserId: string; fromUserId: string }) => {
      io.to(`user:${data.toUserId}`).emit("stop-typing", { fromUserId: data.fromUserId });
    });

    // Handle message read events
    socket.on("mark-read", async (data: { conversationUserId: string; currentUserId: string }) => {
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

// Get the io instance
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

// Check if a user is online
export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId);
};

// Get all online users
export const getOnlineUsers = (): string[] => {
  return Array.from(onlineUsers.keys());
};

// Emit a notification to a specific user
export const emitNotification = (userId: string, notification: any) => {
  if (io) {
    io.to(`user:${userId}`).emit("notification", notification);
    console.log(`Notification emitted to user:${userId}`);
  }
};

// Emit unread count update to a specific user
export const emitUnreadCount = (userId: string, count: number) => {
  if (io) {
    io.to(`user:${userId}`).emit("unread-count", count);
    console.log(`Unread count ${count} emitted to user:${userId}`);
  }
};

// Emit a new message to a specific user
export const emitMessage = (userId: string, message: any) => {
  if (io) {
    io.to(`user:${userId}`).emit("new-message", message);
    console.log(`Message emitted to user:${userId}`);
  }
};

// Emit typing indicator to a specific user
export const emitTyping = (userId: string, fromUserId: string) => {
  if (io) {
    io.to(`user:${userId}`).emit("typing", { fromUserId });
  }
};

// Emit stop typing indicator to a specific user
export const emitStopTyping = (userId: string, fromUserId: string) => {
  if (io) {
    io.to(`user:${userId}`).emit("stop-typing", { fromUserId });
  }
};

// Emit message read receipt
export const emitMessageRead = (userId: string, byUserId: string) => {
  if (io) {
    io.to(`user:${userId}`).emit("messages-read", {
      byUserId,
      timestamp: new Date().toISOString(),
    });
  }
};
