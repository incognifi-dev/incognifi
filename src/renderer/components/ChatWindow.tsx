import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FiX, FiMinus, FiMaximize2, FiSend, FiMoreVertical } from "react-icons/fi";
import type { Friend, ChatMessage } from "../types/social";
import { dummyMessages } from "../data/dummyFriends";

interface ChatWindowProps {
  friend: Friend;
  chatId: string;
  onClose: () => void;
  onMinimize: () => void;
  position?: { right: number };
}

export function ChatWindow({ friend, chatId, onClose, onMinimize, position = { right: 288 } }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => dummyMessages[friend.id] || []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: "me",
      content: message,
      timestamp: new Date().toISOString(),
      isRead: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");

    // Simulate friend typing and response
    setTimeout(() => {
      const responses = [
        "That's interesting! Tell me more.",
        "I see what you mean.",
        "Great point!",
        "Let me think about that.",
        "Have you considered trying a different approach?",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const responseMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: friend.id,
        content: randomResponse,
        timestamp: new Date().toISOString(),
        isRead: false,
      };

      setMessages((prev) => [...prev, responseMessage]);
    }, 2000 + Math.random() * 2000); // Random delay between 2-4 seconds
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{ right: position.right }}
      className="fixed bottom-12 w-80 h-96 bg-gray-900 rounded-t-lg overflow-hidden shadow-lg border border-gray-800"
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/95 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
              <span className="text-sm text-white font-medium">{friend.username.charAt(0).toUpperCase()}</span>
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${
                friend.status === "online" ? "bg-green-500" : friend.status === "away" ? "bg-yellow-500" : "bg-gray-500"
              }`}
            />
          </div>
          <div>
            <h3 className="text-white font-medium leading-none">{friend.username}</h3>
            <span className="text-xs text-gray-400">{friend.status}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onMinimize}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
          >
            <FiMinus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto h-[calc(100%-8rem)] p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] ${
                msg.senderId === "me"
                  ? "bg-violet-600 text-white rounded-l-lg rounded-tr-lg"
                  : "bg-gray-800 text-gray-100 rounded-r-lg rounded-tl-lg"
              } px-4 py-2 space-y-1`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs opacity-75">{formatTime(msg.timestamp)}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800">
        <div className="flex items-end space-x-2">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 max-h-32 min-h-[2.5rem] resize-none"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="p-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiSend className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
