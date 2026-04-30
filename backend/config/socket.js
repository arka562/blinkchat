import { Server } from "socket.io";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

let io;
const userSocketMap = {}; // { userId: socketId }

// 🔌 Initialize Socket.IO with existing HTTP server
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [process.env.CLIENT_URL],
      credentials: true,
    },
  });

  // 🔐 Apply authentication middleware
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.userId;

    if (process.env.NODE_ENV === "development") {
      console.log("User connected:", socket.user?._id);
    }

    // Store user socket
    userSocketMap[userId] = socket.id;

    // Emit updated online users list
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Handle disconnect
    socket.on("disconnect", () => {
      if (process.env.NODE_ENV === "development") {
        console.log("User disconnected:", userId);
      }

      if (userSocketMap[userId]) {
        delete userSocketMap[userId];
      }

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