import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessagesAsSeen,
    isTyping,
  } = useChatStore();

  const { authUser, socket } = useAuthStore(); // ✅ include socket
  const messageEndRef = useRef(null);

  // ================= MAIN EFFECT =================
  useEffect(() => {
    if (!selectedUser?._id || !socket) return;

    console.log("🔥 SUBSCRIBING TO SOCKET EVENTS");

    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();
    markMessagesAsSeen(selectedUser._id);

    return () => {
      unsubscribeFromMessages();
    };
  }, [selectedUser?._id, socket]); // ✅ CRITICAL FIX

  // ================= AUTO SCROLL =================
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({
        behavior: messages.length > 20 ? "auto" : "smooth",
      });
    }
  }, [messages]);

  return (
    <>
      <ChatHeader />

      <div className="flex-1 px-6 overflow-y-auto py-8">
        {/* ================= MESSAGES ================= */}
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => {
              const isOwn =
                msg.senderId?.toString() === authUser?._id?.toString();

              return (
                <div
                  key={msg._id || msg.tempId}
                  className={`chat ${isOwn ? "chat-end" : "chat-start"}`}
                >
                  <div
                    className={`chat-bubble relative ${
                      isOwn
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {/* IMAGE */}
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Shared"
                        loading="lazy"
                        className="rounded-lg h-48 object-cover"
                      />
                    )}

                    {/* TEXT */}
                    {msg.text && <p className="mt-2">{msg.text}</p>}

                    {/* TIME + STATUS */}
                    <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {isOwn && (
                        <span>
                          {msg.seen ? "✔✔" : "✔"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messageEndRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser?.fullName} />
        )}
      </div>

      {/* 🔥 TYPING INDICATOR (FINAL POSITION) */}
      {isTyping && (
        <p className="text-sm text-slate-400 px-6 pb-1 animate-pulse">
          {selectedUser?.fullName} is typing...
        </p>
      )}

      <MessageInput />
    </>
  );
}

export default ChatContainer;