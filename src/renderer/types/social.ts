export interface Friend {
  id: string;
  username: string;
  status: "online" | "away" | "offline";
  lastSeen?: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface Chat {
  id: string;
  friendId: string;
  messages: ChatMessage[];
  isMinimized: boolean;
}

export type UserStatus = "online" | "away" | "offline";

export interface UserData {
  username: string;
  status: UserStatus;
}
