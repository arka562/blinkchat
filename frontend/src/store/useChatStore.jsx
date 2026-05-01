import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isTyping: false,
  unreadCounts: {},

  // safer localStorage parsing
  isSoundEnabled: (() => {
    try {
      return JSON.parse(localStorage.getItem("isSoundEnabled")) ?? true;
    } catch {
      return true;
    }
  })(),

  // ================= SETTINGS =================
  toggleSound: () => {
    const newValue = !get().isSoundEnabled;
    localStorage.setItem("isSoundEnabled", JSON.stringify(newValue));
    set({ isSoundEnabled: newValue });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  // ================= SELECT USER =================
  setSelectedUser: (selectedUser) => {
    const counts = { ...get().unreadCounts };

    if (selectedUser?._id) {
      delete counts[selectedUser._id.toString()];
    }

    set({
      selectedUser,
      isTyping: false,
      unreadCounts: counts,
    });
  },

  // ================= CONTACTS =================
  fetchContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res?.data?.users || [] });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  fetchChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      set({ chats: res?.data?.users || [] });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch chats");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // ================= MESSAGES =================
  getMessagesByUserId: async (userId) => {
    if (!userId) return;

    set({ isMessagesLoading: true });

    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res?.data?.messages || [] });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // ================= UNREAD =================
  fetchUnreadCounts: async () => {
    try {
      const res = await axiosInstance.get("/messages/unread");

      const map = {};

      (res?.data?.unread || []).forEach((item) => {
        if (item?._id) {
          map[item._id.toString()] = item.count || 0;
        }
      });

      set({ unreadCounts: map });
    } catch (error) {
      console.log("Unread fetch error:", error);
    }
  },

  // ================= SEND MESSAGE =================
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();

    if (!selectedUser || !authUser?._id) {
      toast.error("User not selected or auth missing");
      return;
    }

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData?.text || "",
      image: messageData?.image || null,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );

      const newMessage = res?.data?.message;

      if (!newMessage) throw new Error("Invalid response");

      set((state) => ({
        messages: [
          ...state.messages.filter((m) => m._id !== tempId),
          newMessage,
        ],
      }));
    } catch (error) {
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== tempId),
      }));

      toast.error(error?.response?.data?.message || "Failed to send message");
    }
  },

  // ================= SEEN =================
  markMessagesAsSeen: async (userId) => {
    if (!userId) return;

    try {
      await axiosInstance.put(`/messages/seen/${userId}`);
    } catch (error) {
      console.log("Seen update failed:", error);
    }
  },

  // ================= SOCKET =================
  // typing, stopTyping, messagesSeen are registered once at connect
  // time in useAuthStore — not here — to avoid useEffect race condition
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;

    if (!socket) return;

    socket.off("newMessage");

    socket.on("newMessage", (msg) => {
      if (!msg) return;

      const currentSelected = get().selectedUser;
      const senderId = msg?.senderId?.toString();

      if (!senderId) return;

      if (currentSelected && senderId === currentSelected?._id?.toString()) {
        // message is from currently open chat — append
        set((state) => ({
          messages: [...state.messages, msg],
        }));

        // play sound if enabled
        if (get().isSoundEnabled) {
          const sound = new Audio("/sounds/notification.mp3");
          sound.currentTime = 0;
          sound.play().catch(() => {});
        }
      } else {
        // message from a different chat — increment unread
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [senderId]: (state.unreadCounts[senderId] || 0) + 1,
          },
        }));
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // only remove newMessage — typing/stopTyping/messagesSeen
    // are persistent for socket lifetime, managed in useAuthStore
    socket.off("newMessage");
  },
}));