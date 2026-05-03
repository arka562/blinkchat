import { Server } from "socket.io";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

let io;
const userSocketMap = {};

export const initSocket = (server) => {
  const allowedOrigins = process.env.CLIENT_URL
    ? [process.env.CLIENT_URL]
    : ["http://localhost:5173"];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
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

    if (!userSocketMap[userId]) {
      userSocketMap[userId] = new Set();
    }

    userSocketMap[userId].add(socket.id);

    console.log("📌 MAP AFTER CONNECT:", userSocketMap);

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("typing", ({ to }) => {
      const targetId = to.toString();
      const receiverSockets = getReceiverSocketIds(targetId);

      if (receiverSockets?.size) {
        for (const id of receiverSockets) {
          io.to(id).emit("typing", { from: userId });
        }
      }
    });

    socket.on("stopTyping", ({ to }) => {
      const targetId = to.toString();
      const receiverSockets = getReceiverSocketIds(targetId);

      if (receiverSockets?.size) {
        for (const id of receiverSockets) {
          io.to(id).emit("stopTyping", { from: userId });
        }
      }
    });

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

export const getReceiverSocketIds = (userId) => {
  return userSocketMap[userId?.toString()];
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};