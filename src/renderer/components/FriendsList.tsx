import React, { useCallback, useEffect, useState } from "react";
import { FiUserPlus, FiCheck, FiX, FiUserX, FiUsers } from "react-icons/fi";
import { StatusSelector } from "./StatusSelector";
import type { UserStatus } from "../types/social";

const { ipcRenderer } = window.require("electron");

interface Friend {
  id: string;
  username: string;
  status: UserStatus;
  lastSeen?: Date;
}

interface FriendsListProps {
  username: string;
  onClose: () => void;
}

export function FriendsList({ username, onClose }: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentStatus, setCurrentStatus] = useState<UserStatus>("online");
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [friendRequests, setFriendRequests] = useState<{ id: string; username: string }[]>([]);
  const [showingSection, setShowingSection] = useState<"friends" | "requests">("friends");

  // Load friends and status from storage
  useEffect(() => {
    const savedFriends = localStorage.getItem("friends");
    if (savedFriends) {
      try {
        const parsed = JSON.parse(savedFriends);
        // Convert lastSeen back to Date objects
        const friendsWithDates = parsed.map((friend: any) => ({
          ...friend,
          lastSeen: friend.lastSeen ? new Date(friend.lastSeen) : undefined,
        }));
        setFriends(friendsWithDates);
      } catch (error) {
        console.error("Failed to parse saved friends:", error);
      }
    }

    const savedStatus = localStorage.getItem("userStatus");
    if (savedStatus) {
      setCurrentStatus(savedStatus as UserStatus);
    }

    const savedRequests = localStorage.getItem("friendRequests");
    if (savedRequests) {
      try {
        setFriendRequests(JSON.parse(savedRequests));
      } catch (error) {
        console.error("Failed to parse saved friend requests:", error);
      }
    }
  }, []);

  // Save friends to storage
  useEffect(() => {
    localStorage.setItem("friends", JSON.stringify(friends));
  }, [friends]);

  // Save status to storage
  useEffect(() => {
    localStorage.setItem("userStatus", currentStatus);
  }, [currentStatus]);

  // Save friend requests to storage
  useEffect(() => {
    localStorage.setItem("friendRequests", JSON.stringify(friendRequests));
  }, [friendRequests]);

  const handleStatusChange = useCallback(
    (newStatus: UserStatus) => {
      setCurrentStatus(newStatus);
      setShowStatusSelector(false);
      ipcRenderer.invoke("broadcast-status", { username, status: newStatus });
    },
    [username]
  );

  const acceptFriendRequest = (requestId: string, requestUsername: string) => {
    const newFriend: Friend = {
      id: requestId,
      username: requestUsername,
      status: "offline",
      lastSeen: new Date(),
    };

    setFriends((prev) => [...prev, newFriend]);
    setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));

    // Send acceptance notification
    ipcRenderer.invoke("send-friend-acceptance", {
      to: requestUsername,
      from: username,
    });
  };

  const declineFriendRequest = (requestId: string) => {
    setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
  };

  const removeFriend = (friendId: string) => {
    setFriends((prev) => prev.filter((friend) => friend.id !== friendId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header with status */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(currentStatus)} border-2 border-white`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{username}</h3>
            <p className="text-sm text-gray-600 capitalize">{currentStatus}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowStatusSelector(!showStatusSelector)}
            className="p-2 hover:bg-violet-100 rounded-full transition-colors"
            title="Change status"
          >
            <div className={`w-2 h-2 rounded-full ${getStatusColor(currentStatus)}`} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Selector */}
      {showStatusSelector && (
        <div className="animate-slide-down">
          <StatusSelector
            currentStatus={currentStatus}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setShowingSection("friends")}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            showingSection === "friends"
              ? "text-violet-600 border-b-2 border-violet-600 bg-violet-50"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <FiUsers className="w-4 h-4" />
            <span>Friends ({friends.length})</span>
          </div>
        </button>
        <button
          onClick={() => setShowingSection("requests")}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
            showingSection === "requests"
              ? "text-violet-600 border-b-2 border-violet-600 bg-violet-50"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <FiUserPlus className="w-4 h-4" />
            <span>Requests</span>
            {friendRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {friendRequests.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="max-h-64 overflow-y-auto">
        {showingSection === "friends" ? (
          friends.length === 0 ? (
            <div className="p-6 text-center text-gray-500 animate-fade-in">
              <FiUsers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No friends yet</p>
              <p className="text-xs mt-1">Connect with other users to see them here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group animate-fade-in"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${getStatusColor(friend.status)} border border-white`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{friend.username}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {friend.status === "offline" && friend.lastSeen
                          ? `Last seen ${friend.lastSeen.toLocaleDateString()}`
                          : friend.status}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFriend(friend.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 text-red-600 rounded transition-all"
                    title="Remove friend"
                  >
                    <FiUserX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : friendRequests.length === 0 ? (
          <div className="p-6 text-center text-gray-500 animate-fade-in">
            <FiUserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No friend requests</p>
            <p className="text-xs mt-1">Incoming requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {friendRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-blue-50 border-l-4 border-blue-400 animate-slide-down"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{request.username}</p>
                  <p className="text-xs text-gray-600">wants to be friends</p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => acceptFriendRequest(request.id, request.username)}
                    className="p-1 hover:bg-green-100 text-green-600 rounded transition-colors"
                    title="Accept"
                  >
                    <FiCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => declineFriendRequest(request.id)}
                    className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                    title="Decline"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
