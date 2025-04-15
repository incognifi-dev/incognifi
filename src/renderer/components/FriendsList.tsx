import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FiSearch, FiPlus, FiMoreVertical } from "react-icons/fi";
import { Friend } from "../types/social";

interface FriendsListProps {
  friends: Friend[];
  onChatStart: (friendId: string) => void;
}

export function FriendsList({ friends, onChatStart }: FriendsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");

  const filteredFriends = useMemo(() => {
    return friends
      .filter((friend) => {
        const matchesSearch = friend.username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
          filter === "all" ||
          (filter === "online" && friend.status !== "offline") ||
          (filter === "offline" && friend.status === "offline");
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        // Sort online users first, then by username
        if (a.status !== "offline" && b.status === "offline") return -1;
        if (a.status === "offline" && b.status !== "offline") return 1;
        return a.username.localeCompare(b.username);
      });
  }, [friends, searchQuery, filter]);

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

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filter */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === "all" ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("online")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === "online" ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Online
          </button>
          <button
            onClick={() => setFilter("offline")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === "offline" ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Offline
          </button>
        </div>
      </div>

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto">
        {filteredFriends.map((friend) => (
          <motion.div
            key={friend.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 py-3 hover:bg-gray-800 cursor-pointer group"
            onClick={() => onChatStart(friend.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
                    <span className="text-sm text-white font-medium">{friend.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${getStatusColor(
                      friend.status
                    )}`}
                  />
                </div>
                <div>
                  <div className="text-white font-medium">{friend.username}</div>
                  {friend.status === "offline" && friend.lastSeen && (
                    <div className="text-xs text-gray-400">Last seen {formatLastSeen(friend.lastSeen)}</div>
                  )}
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity">
                <FiMoreVertical className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Friend Button */}
      <div className="p-4 border-t border-gray-800">
        <button className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
          <FiPlus className="w-5 h-5" />
          <span>Add Friend</span>
        </button>
      </div>
    </div>
  );
}
