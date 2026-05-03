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
  loadMoreMessages,
  hasMore,
  reactToMessage   // ✅ ADD THIS
} = useChatStore();

  const { authUser, socket } = useAuthStore();

  const messageEndRef = useRef(null);
  const containerRef = useRef(null);

  // ================= MAIN EFFECT =================
  useEffect(() => {
    if (!selectedUser?._id || !socket) return;

    console.log("🔥 SUBSCRIBING TO SOCKET EVENTS");

    // ✅ FIX 1: always load page 1
    getMessagesByUserId(selectedUser._id, 1);

    subscribeToMessages();
    markMessagesAsSeen(selectedUser._id);

    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, socket]);

  // ================= AUTO SCROLL =================
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  // ================= PAGINATION SCROLL =================
  const isFetchingRef = useRef(false);

  const handleScroll = async () => {
    const container = containerRef.current;
    if (!container) return;

    // ✅ FIX 2: prevent spam calls
    if (container.scrollTop < 50 && !isFetchingRef.current && hasMore) {
      isFetchingRef.current = true;

      const prevHeight = container.scrollHeight;

      await loadMoreMessages();

      // ✅ FIX 3: maintain scroll position
      requestAnimationFrame(() => {
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - prevHeight;
        isFetchingRef.current = false;
      });
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);

    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore]);

  return (
    <>
      <ChatHeader />

      <div
        ref={containerRef}
        className="flex-1 px-6 overflow-y-auto py-8"
      >
        {/* 🔥 Loader for older messages */}
        {isMessagesLoading && (
          <p className="text-center text-slate-400 text-sm mb-2">
            Loading older messages...
          </p>
        )}

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
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Shared"
                        loading="lazy"
                        className="rounded-lg h-48 object-cover"
                      />
                    )}

                    {msg.text && <p className="mt-2">{msg.text}</p>}

                    {/* TIME + STATUS */}
<div className="flex items-center gap-1 mt-1 text-xs opacity-75">
  <span>
    {new Date(msg.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}
  </span>

  {isOwn && <span>{msg.isSeen ? "✔✔" : "✔"}</span>}
</div>

{/* 🔥 REACTIONS DISPLAY */}
{msg.reactions?.length > 0 && (
  <div className="flex gap-1 mt-1">
    {msg.reactions.map((r, i) => (
      <span key={i} className="text-xs bg-slate-700 px-2 rounded">
        {r.emoji}
      </span>
    ))}
  </div>
)}

{/* 🔥 REACTION BUTTONS */}
<div className="flex gap-2 mt-2">
  {["🔥", "❤️", "👍"].map((emoji) => (
    <button
      key={emoji}
      onClick={() => reactToMessage(msg._id, emoji)}
      className="text-sm hover:scale-125 transition"
    >
      {emoji}
    </button>
  ))}
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

      {/* 🔥 TYPING INDICATOR */}
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