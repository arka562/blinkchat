import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UserLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { useAuthStore } from "../store/useAuthStore";

function ChatsList() {
  const {
    chats,
    isUsersLoading,
    setSelectedUser,
    fetchChatPartners,
    fetchUnreadCounts,
    unreadCounts, // ✅ added
  } = useChatStore();

  const { onlineUsers } = useAuthStore();

useEffect(() => {
  fetchChatPartners();
  fetchUnreadCounts(); // 🔥 IMPORTANT
}, []);

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  return (
    <>
      {chats.map((chat) => (
        <div
          key={chat._id}
          className="bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors"
          onClick={() => setSelectedUser(chat)}
        >
          <div className="flex items-center justify-between">
            
            {/* LEFT SIDE */}
            <div className="flex items-center gap-3">
              <div
                className={`avatar ${
                  onlineUsers.includes(chat._id) ? "online" : "offline"
                }`}
              >
                <div className="size-12 rounded-full">
                  <img
                    src={chat.profilePic || "/avatar.png"}
                    alt={chat.fullName}
                  />
                </div>
              </div>

              <h4 className="text-slate-200 font-medium truncate">
                {chat.fullName}
              </h4>
            </div>

            {/* RIGHT SIDE - 🔥 UNREAD BADGE */}
            {unreadCounts?.[chat._id] > 0 && (
              <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCounts[chat._id]}
              </span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

export default ChatsList;