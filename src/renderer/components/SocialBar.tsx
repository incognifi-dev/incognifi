import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMessageSquare, FiUser, FiChevronUp } from "react-icons/fi";
import { UsernameSetupModal } from "./UsernameSetupModal";
import { FriendsList } from "./FriendsList";
import { ChatWindow } from "./ChatWindow";
import { StatusSelector } from "./StatusSelector";
import { dummyFriends } from "../data/dummyFriends";
import type { UserData, Chat, UserStatus } from "../types/social";

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
        {/* Chat Button */}
        <button
          onClick={handleChatClick}
          className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
        >
          <div className="relative">
            <FiMessageSquare className="w-5 h-5" />
            {userData && (
              <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getStatusColor(userData.status)}`} />
            )}
          </div>
          <span className="text-sm font-medium">Chat Demo</span>
        </button>

        {/* Active Chats */}
        <div className="flex-1 flex items-center space-x-2 px-4">
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
