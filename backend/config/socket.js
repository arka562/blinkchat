import { Server } from "socket.io";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

let io;
const userSocketMap = {}; // { userId: [socketId1, socketId2] }

// 🔌 Initialize Socket.IO
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

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
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

      if (receiverSockets) {
        receiverSockets.forEach((id) => {
          io.to(id).emit("typing", { from: userId });
        });
      }
    });

    // ================= STOP TYPING =================
    socket.on("stopTyping", ({ to }) => {
      const targetId = to.toString();
      const receiverSockets = getReceiverSocketIds(targetId);

      if (receiverSockets) {
        receiverSockets.forEach((id) => {
          io.to(id).emit("stopTyping", { from: userId });
        });
      }
    });

    // ================= DISCONNECT =================
    socket.on("disconnect", () => {
      console.log("🔴 USER DISCONNECTED:", userId);

      if (userSocketMap[userId]) {
        userSocketMap[userId].delete(socket.id);

        // remove user only if no active sockets
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