import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000"
    : import.meta.env.VITE_SERVER_URL || window.location.origin;

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  socket: null,
  onlineUsers: [],

  // ================= AUTH CHECK =================
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

  // ================= SIGNUP =================
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);

      set({ authUser: res.data.user });

      toast.success("Account created successfully!");

      get().connectSocket();

      return true; // ✅ IMPORTANT
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  // ================= LOGIN =================
  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);

      set({ authUser: res.data.user });

      toast.success("Logged in successfully");

      get().connectSocket();

      return true; // ✅ FIX (MOST IMPORTANT)
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      return false; // ✅ FIX
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // ================= LOGOUT =================
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");

      const socket = get().socket;
      if (socket) socket.disconnect();

      set({
        authUser: null,
        socket: null,
        onlineUsers: [],
      });

      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Error logging out");
      console.log("Logout error:", error);
    }
  },

  // ================= UPDATE PROFILE =================
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

  // ================= SOCKET CONNECT =================
  connectSocket: () => {
    const { authUser, socket } = get();

    if (!authUser) return;

    // prevent duplicate
    if (socket?.connected) return;

    if (socket) socket.disconnect();

    const newSocket = io(BASE_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    set({ socket: newSocket });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);

      // 🔥 FIX SAFE IMPORT (no crash)
      import("../store/useChatStore")
        .then((module) => {
          if (module?.useChatStore) {
            module.useChatStore.getState().subscribeToMessages();
          }
        })
        .catch((err) => {
          console.log("Chat store load error:", err);
        });
    });

    newSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    newSocket.on("connect_error", (err) => {
      console.log("❌ Socket error:", err.message);
    });

    newSocket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
    });
  },

  // ================= DISCONNECT =================
  disconnectSocket: () => {
    const socket = get().socket;

    if (socket) socket.disconnect();

    set({
      socket: null,
      onlineUsers: [],
    });
  },
}));