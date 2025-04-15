import { Friend, ChatMessage } from "../types/social";

export const dummyFriends: Friend[] = [
  {
    id: "1",
    username: "CryptoKing",
    status: "online",
    lastSeen: new Date().toISOString(),
  },
  {
    id: "2",
    username: "BlockchainDev",
    status: "away",
    lastSeen: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
  },
  {
    id: "3",
    username: "Web3Wizard",
    status: "offline",
    lastSeen: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
  },
  {
    id: "4",
    username: "TokenTrader",
    status: "online",
    lastSeen: new Date().toISOString(),
  },
  {
    id: "5",
    username: "DeFiExplorer",
    status: "online",
    lastSeen: new Date().toISOString(),
  },
];

export const dummyMessages: { [key: string]: ChatMessage[] } = {
  "1": [
    {
      id: "1",
      senderId: "1",
      content: "Hey, did you see the new DEX launch?",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      isRead: true,
    },
    {
      id: "2",
      senderId: "me",
      content: "Yeah, the liquidity pools look promising!",
      timestamp: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
      isRead: true,
    },
  ],
  "2": [
    {
      id: "1",
      senderId: "2",
      content: "Working on a new smart contract?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      isRead: false,
    },
  ],
};
