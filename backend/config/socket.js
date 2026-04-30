import { Server } from "socket.io";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

let io;
const userSocketMap = {}; // { userId: socketId }

// 🔌 Initialize Socket.IO with existing HTTP server
export const initSocket = (server) => {
  io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "development"
      ? ["http://localhost:5173", "http://localhost:5174"]
      : [process.env.CLIENT_URL],
    credentials: true,
  },
});

  // 🔐 Apply authentication middleware
  io.use(socketAuthMiddleware);

 io.on("connection", (socket) => {
  const userId = socket.userId;

  userSocketMap[userId] = socket.id;
  
  // ✅ Tell everyone someone came online
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", (reason) => {
    delete userSocketMap[userId];
    // ✅ Tell everyone someone went offline
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

  return io;
};

// 📡 Get receiver socket ID
export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId];
};

// 📤 Export io instance getter (safe access)
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

