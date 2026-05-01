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
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data.user });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    }
  },

  // ================= SOCKET =================
  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) return;

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
      console.log("CONNECTED USER:", authUser._id);

      // ✅ Register typing + seen listeners ONCE at connect time
      // These must NOT be in subscribeToMessages — they need to be
      // active before any useEffect runs, to avoid the race condition
      import("./useChatStore").then(({ useChatStore }) => {
        const chatStore = useChatStore.getState;

        // ================= TYPING =================
        newSocket.off("typing");
        newSocket.on("typing", ({ from }) => {
          const { selectedUser } = useChatStore.getState();
          if (selectedUser?._id.toString() === from.toString()) {
            useChatStore.setState({ isTyping: true });
          }
        });

        newSocket.off("stopTyping");
        newSocket.on("stopTyping", ({ from }) => {
          const { selectedUser } = useChatStore.getState();
          if (selectedUser?._id.toString() === from.toString()) {
            useChatStore.setState({ isTyping: false });
          }
        });

        // ================= SEEN =================
        newSocket.off("messagesSeen");
        newSocket.on("messagesSeen", ({ seenBy }) => {
          const { messages } = useChatStore.getState();
          const updated = messages.map((msg) => {
            if (msg.receiverId?.toString() === seenBy?.toString()) {
              return { ...msg, seen: true };
            }
            return msg;
          });
          useChatStore.setState({ messages: updated });
        });

        // re-subscribe newMessage if chat is already open
        if (useChatStore.getState().selectedUser) {
          useChatStore.getState().subscribeToMessages();
        }
      });
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