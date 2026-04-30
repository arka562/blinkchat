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
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled") || "true"),

  toggleSound: () => {
    const newValue = !get().isSoundEnabled;
    localStorage.setItem("isSoundEnabled", newValue);
    set({ isSoundEnabled: newValue });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  // ================= CONTACTS =================
 fetchContacts: async () => {
  set({ isUsersLoading: true });
  try {
    const res = await axiosInstance.get("/messages/contacts");
    set({ allContacts: res.data.users });
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to fetch contacts");
  } finally {
    set({ isUsersLoading: false });
  }
},

fetchChatPartners: async () => {
  set({ isUsersLoading: true });
  try {
    const res = await axiosInstance.get("/messages/chats");
    set({ chats: res.data.users });
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to fetch chats");
  } finally {
    set({ isUsersLoading: false });
  }
},
  // ================= MESSAGES =================
  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data.messages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // ================= SEND MESSAGE =================
  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const { authUser } = useAuthStore.getState();

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    set({ messages: [...get().messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );

      set({
        messages: [
          ...get().messages.filter((m) => m._id !== tempId),
          res.data.message,
        ],
      });
    } catch (error) {
      set({
        messages: get().messages.filter((m) => m._id !== tempId),
      });

      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // ================= SOCKET =================
  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    const socket = useAuthStore.getState().socket;

    if (!socket || !selectedUser) return;

    socket.off("newMessage");

    socket.on("newMessage", (newMessage) => {
      const isFromSelectedUser =
        newMessage.senderId.toString() === selectedUser._id.toString();

      if (!isFromSelectedUser) return;

      set({ messages: [...get().messages, newMessage] });

      if (isSoundEnabled) {
        const sound = new Audio("/sounds/notification.mp3");
        sound.currentTime = 0;
        sound.play().catch(() => {});
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
  },
}));