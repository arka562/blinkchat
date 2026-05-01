import { Server } from "socket.io";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

let io;
const userSocketMap = {}; // { userId: socketId }

// 🔌 Initialize Socket.IO with existing HTTP server
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin:
        process.env.NODE_ENV === "development"
          ? ["http://localhost:5173", "http://localhost:5174"]
          : [process.env.CLIENT_URL],
      credentials: true,
    },
  });

  // 🔐 Apply authentication middleware
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.userId.toString();

    console.log("🟢 USER CONNECTED:", userId);

    // ✅ store as string key
    userSocketMap[userId] = socket.id;

    console.log("📌 MAP AFTER CONNECT:", userSocketMap);

    // broadcast online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // ================= TYPING =================
    socket.on("typing", ({ to }) => {
      const targetId = to.toString();
      const receiverSocketId = getReceiverSocketId(targetId);

      console.log("🔥 SERVER RECEIVED TYPING:", userId, "→", targetId);
      console.log("📌 MAP STATE:", userSocketMap);
      console.log("🔍 LOOKING FOR:", targetId);
      console.log("🎯 FOUND SOCKET:", receiverSocketId);

      if (receiverSocketId) {
        console.log("🚀 SENDING TYPING EVENT");

        io.to(receiverSocketId).emit("typing", {
          from: userId,
        });
      }
    });

    // ================= STOP TYPING =================
    socket.on("stopTyping", ({ to }) => {
      const targetId = to.toString();
      const receiverSocketId = getReceiverSocketId(targetId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stopTyping", {
          from: userId,
        });
      }
    });

    // ================= DISCONNECT =================
    socket.on("disconnect", () => {
      console.log("🔴 USER DISCONNECTED:", userId);

      delete userSocketMap[userId];

      console.log("📌 MAP AFTER DISCONNECT:", userSocketMap);

      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });

  return io;
};

// 📡 Get receiver socket ID (safe)
export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId?.toString()];
};

// 📤 Export io instance getter
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};