import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000"
    : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data.user });
      get().connectSocket();
    } catch (error) {
      console.log("Error in authCheck:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data.user });

      toast.success("Account created successfully!");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data.user });

      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error("Error logging out");
      console.log("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data.user });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response?.data?.message || "Update failed");
    }
  },

  connectSocket: () => {
  const { authUser, socket } = get();
  if (!authUser) return;

  // ❌ avoid duplicate connections
  if (socket?.connected) return;

  // cleanup old socket
  if (socket) {
    socket.disconnect();
  }

  const newSocket = io(BASE_URL, {
    withCredentials: true,
    transports: ["websocket"], // 🔥🔥🔥 CRITICAL FIX
    reconnection: true,
    reconnectionAttempts: 5,
  });

  newSocket.on("connect", () => {
    console.log("✅ Socket connected:", newSocket.id);
    console.log("CONNECTED USER:", authUser._id);
    set({ socket: newSocket });
  });

  newSocket.on("getOnlineUsers", (userIds) => {
    console.log("🟢 Online users:", userIds);
    set({ onlineUsers: userIds });
  });

  newSocket.on("connect_error", (err) => {
    console.log("❌ Socket error:", err.message);
  });
},

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket?.connected) socket.disconnect();
    set({ socket: null });
  },
}));