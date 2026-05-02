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
  hasMore: true,
page: 1,

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

  loadMoreMessages: async () => {
  const { selectedUser, page, hasMore } = get();

  if (!hasMore || !selectedUser) return;

  const nextPage = page + 1;

  await get().getMessagesByUserId(selectedUser._id, nextPage);

  set({ page: nextPage });
},

  // ================= MESSAGES =================
  getMessagesByUserId: async (userId, page = 1) => {
  try {
    set({ isMessagesLoading: true });

    const res = await axiosInstance.get(
      `/messages/${userId}?page=${page}&limit=20`
    );

    const newMessages = res.data.messages;

    if (page === 1) {
      // first load
      set({
        messages: newMessages,
        hasMore: res.data.hasMore,
      });
    } else {
      // prepend older messages
      set({
        messages: [...newMessages, ...get().messages],
        hasMore: res.data.hasMore,
      });
    }
  } catch (error) {
    toast.error("Failed to fetch messages");
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

    if (!selectedUser || !authUser?._id) return;

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
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");

    socket.on("newMessage", (msg) => {
      const currentSelected = get().selectedUser;

      const senderId =
        typeof msg.senderId === "object"
          ? msg.senderId._id.toString()
          : msg.senderId.toString();

      const senderName =
        typeof msg.senderId === "object"
          ? msg.senderId.fullName
          : "User";

      const currentSelectedId = currentSelected?._id?.toString();

      if (currentSelectedId === senderId) {
        // append message
        const existing = get().messages;
        const alreadyExists = existing.some((m) => m._id === msg._id);
        if (!alreadyExists) {
          set({ messages: [...existing, msg] });
        }
      } else {
        // unread
        const counts = { ...get().unreadCounts };
        counts[senderId] = (counts[senderId] || 0) + 1;
        set({ unreadCounts: counts });

        // notification
        if (Notification.permission === "granted" && document.hidden) {
          new Notification(`New message from ${senderName}`, {
            body: msg.text || "📷 Image received",
          });
        }
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
  },
}));