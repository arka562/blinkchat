import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";

import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";

function ChatPage() {
  const {
    activeTab,
    selectedUser,
    fetchContacts,
    fetchChatPartners,
  } = useChatStore();

  

useEffect(() => {
  fetchChatPartners();
}, [fetchChatPartners]);

  return (
    <div className="relative w-full max-w-6xl min-h-screen md:h-[800px]">
      <BorderAnimatedContainer>
        
        {/* Sidebar */}
        <div className="w-full md:w-80 bg-slate-800/50 backdrop-blur-sm flex flex-col">
          <ProfileHeader />
          <ActiveTabSwitch />

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeTab === "chats" ? <ChatsList /> : <ContactList />}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm">
          {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
        </div>

      </BorderAnimatedContainer>
    </div>
  );
}

export default ChatPage;