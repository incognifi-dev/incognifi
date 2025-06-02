import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiChevronUp, FiMapPin, FiMessageSquare } from "react-icons/fi";
import { dummyFriends } from "../data/dummyFriends";
import { useVPNStore } from "../stores/vpnStore";
import type { Chat, UserData, UserStatus } from "../types/social";
import { ChatWindow } from "./ChatWindow";
import { FriendsList } from "./FriendsList";
import { NetworkStats } from "./NetworkStats";
import { StatusSelector } from "./StatusSelector";
import { UsernameSetupModal } from "./UsernameSetupModal";

// Utility function to convert country code to flag emoji
const getCountryFlag = (countryCode?: string): string => {
  if (!countryCode || countryCode.length !== 2) return "🌐";

  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
};

export function SocialBar() {
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeChats, setActiveChats] = useState<Chat[]>([]);

  // Load user data from localStorage on mount
  useEffect(() => {
    const savedUserData = localStorage.getItem("userData");
    if (savedUserData) {
      setUserData(JSON.parse(savedUserData));
    }
  }, []);

  // Get VPN state for server information
  const { vpnState } = useVPNStore();

  const handleChatClick = () => {
    if (!userData) {
      setIsSetupModalOpen(true);
    } else {
      setIsChatOpen(!isChatOpen);
    }
  };

  const handleSetupComplete = (username: string) => {
    const newUserData = {
      username,
      status: "online" as const,
    };
    setUserData(newUserData);
    localStorage.setItem("userData", JSON.stringify(newUserData));
    setIsSetupModalOpen(false);
    setIsChatOpen(true);
  };

  const handleChatStart = (friendId: string) => {
    // Check if chat already exists
    const existingChat = activeChats.find((chat) => chat.friendId === friendId);
    if (existingChat) {
      // If minimized, un-minimize it
      if (existingChat.isMinimized) {
        setActiveChats((prev) =>
          prev.map((chat) => (chat.id === existingChat.id ? { ...chat, isMinimized: false } : chat))
        );
      }
    } else {
      // Create new chat
      const newChat: Chat = {
        id: Date.now().toString(),
        friendId,
        messages: [],
        isMinimized: false,
      };
      setActiveChats((prev) => [...prev, newChat]);
    }
    setIsChatOpen(false);
  };

  const handleChatClose = (chatId: string) => {
    setActiveChats((prev) => prev.filter((chat) => chat.id !== chatId));
  };

  const handleChatMinimize = (chatId: string) => {
    setActiveChats((prev) => prev.map((chat) => (chat.id === chatId ? { ...chat, isMinimized: true } : chat)));
  };

  const handleMinimizedChatClick = (chatId: string) => {
    setActiveChats((prev) => prev.map((chat) => (chat.id === chatId ? { ...chat, isMinimized: false } : chat)));
  };

  const handleStatusChange = (status: UserStatus) => {
    if (userData) {
      const newUserData = { ...userData, status };
      setUserData(newUserData);
      localStorage.setItem("userData", JSON.stringify(newUserData));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  // Calculate chat window positions
  const getVisibleChats = () => {
    return activeChats.filter((chat) => !chat.isMinimized);
  };

  const getChatPosition = (index: number) => {
    const baseRight = 288; // Width of friends list + margin
    const spacing = 20;
    const windowWidth = 320;
    return { right: baseRight + (windowWidth + spacing) * index };
  };

  return (
    <>
      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-gray-900 border-t border-gray-800 flex items-center px-4 z-50">
        {/* Network Stats - Left Side */}
        <NetworkStats className="mr-4" />

        {/* Server Info - Left-Center */}
        {vpnState.isConnected && (
          <div className="flex items-center space-x-2 mr-4 border-l border-gray-700 pl-4">
            <FiMapPin className="w-3 h-3 text-violet-400" />
            <div className="flex items-center space-x-1">
              <span className="text-sm">{getCountryFlag(vpnState.currentServer.countryCode)}</span>
              <span className="text-gray-300 text-xs">
                {vpnState.currentServer.country !== "N/A" ? vpnState.currentServer.country : vpnState.currentServer.ip}
              </span>
              <span className="text-gray-500 text-xs">•</span>
              <span className="text-gray-400 text-xs font-mono">
                {vpnState.currentServer.ip}:{vpnState.currentServer.port}
              </span>
            </div>
          </div>
        )}

        {/* Spacer to push chat to the right */}
        <div className="flex-1" />

        {/* Active Minimized Chats - Center Right */}
        <div className="flex items-center space-x-2 mr-4">
          {activeChats
            .filter((chat) => chat.isMinimized)
            .map((chat) => {
              const friend = dummyFriends.find((f) => f.id === chat.friendId);
              if (!friend) return null;

              return (
                <button
                  key={chat.id}
                  onClick={() => handleMinimizedChatClick(chat.id)}
                  className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300 hover:text-white transition-colors flex items-center space-x-2"
                >
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(friend.status)}`} />
                  <span>{friend.username}</span>
                </button>
              );
            })}
        </div>

        {/* User Info and Chat Demo - Right Side */}
        <div className="flex items-center space-x-4">
          {/* User Info (if set up) */}
          {userData && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center">
                  <span className="text-xs text-white font-medium">{userData.username.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm text-gray-300">{userData.username}</span>
              </div>
              <StatusSelector
                currentStatus={userData.status}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}

          {/* Chat Demo Button */}
          <button
            onClick={handleChatClick}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-gray-800"
          >
            <div className="relative">
              <FiMessageSquare className="w-5 h-5" />
              {userData && (
                <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getStatusColor(userData.status)}`} />
              )}
            </div>
            <span className="text-sm font-medium">Chat Demo</span>
          </button>
        </div>
      </div>

      {/* Username Setup Modal */}
      <AnimatePresence>
        {isSetupModalOpen && (
          <UsernameSetupModal
            onComplete={handleSetupComplete}
            onClose={() => setIsSetupModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Friends List Panel */}
      <AnimatePresence>
        {isChatOpen && userData && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 400, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed bottom-12 right-4 w-64 bg-gray-900 rounded-t-lg overflow-hidden shadow-lg border border-gray-800"
          >
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Friends Demo</h3>
                <p className="text-xs text-violet-400">Coming Soon Feature</p>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FiChevronUp className="w-5 h-5" />
              </button>
            </div>
            <FriendsList
              friends={dummyFriends}
              onChatStart={handleChatStart}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Windows */}
      <AnimatePresence>
        {getVisibleChats().map((chat, index) => {
          const friend = dummyFriends.find((f) => f.id === chat.friendId);
          if (!friend) return null;

          return (
            <ChatWindow
              key={chat.id}
              chatId={chat.id}
              friend={friend}
              onClose={() => handleChatClose(chat.id)}
              onMinimize={() => handleChatMinimize(chat.id)}
              position={getChatPosition(index)}
            />
          );
        })}
      </AnimatePresence>
    </>
  );
}
