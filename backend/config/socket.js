import { Server } from "socket.io";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

let io;
const userSocketMap = {}; // { userId: Set(socketIds) }

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    if (!socket.userId) {
      console.log("❌ Unauthorized socket connection");
      return socket.disconnect();
    }

    const userId = socket.userId.toString();
    console.log("🟢 USER CONNECTED:", userId);

    // ================= STORE SOCKET =================
    if (!userSocketMap[userId]) {
      userSocketMap[userId] = new Set();
    }

    userSocketMap[userId].add(socket.id);

    console.log("📌 MAP AFTER CONNECT:", userSocketMap);

    // broadcast online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // ================= TYPING =================
    socket.on("typing", ({ to }) => {
      const targetId = to.toString();
      const receiverSockets = getReceiverSocketIds(targetId);

      if (receiverSockets?.size) {
        for (const id of receiverSockets) {
          io.to(id).emit("typing", { from: userId });
        }
      }
    });

    // ================= STOP TYPING =================
    socket.on("stopTyping", ({ to }) => {
      const targetId = to.toString();
      const receiverSockets = getReceiverSocketIds(targetId);

      if (receiverSockets?.size) {
        for (const id of receiverSockets) {
          io.to(id).emit("stopTyping", { from: userId }); // ✅ FIXED EVENT NAME
        }
      }
    });

    // ================= DISCONNECT =================
    socket.on("disconnect", () => {
      console.log("🔴 USER DISCONNECTED:", userId);

      if (userSocketMap[userId]) {
        userSocketMap[userId].delete(socket.id);

        if (userSocketMap[userId].size === 0) {
          delete userSocketMap[userId];
        }
      }

      console.log("📌 MAP AFTER DISCONNECT:", userSocketMap);

      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });

  return io;
};

// 📡 Get ALL receiver sockets
export const getReceiverSocketIds = (userId) => {
  return userSocketMap[userId?.toString()];
};

// 📤 Get io instance
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};