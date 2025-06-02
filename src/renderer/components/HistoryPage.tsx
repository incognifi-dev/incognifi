import React, { useState, useMemo } from "react";
import { HistoryEntry } from "../types";
import { motion } from "framer-motion";
import { ClockIcon, MagnifyingGlassIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface HistoryPageProps {
  history: HistoryEntry[];
  onHistoryClick: (url: string) => void;
  onRemoveHistoryEntry: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  onHistoryClick,
  onRemoveHistoryEntry,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return history;
    return history.filter(
      (entry) =>
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [history, searchTerm]);

  const groupedHistory = useMemo(() => {
    const groups: { [key: string]: HistoryEntry[] } = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    filteredHistory.forEach((entry) => {
      const entryDate = new Date(entry.visitedAt);
      const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());

      let groupKey: string;
      if (entryDay.getTime() === today.getTime()) {
        groupKey = "Today";
      } else if (entryDay.getTime() === yesterday.getTime()) {
        groupKey = "Yesterday";
      } else {
        groupKey = entryDay.toLocaleDateString();
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(entry);
    });

    // Sort groups by date and entries within groups by visit time
    const sortedGroups: { [key: string]: HistoryEntry[] } = {};
    Object.keys(groups)
      .sort((a, b) => {
        if (a === "Today") return -1;
        if (b === "Today") return 1;
        if (a === "Yesterday") return -1;
        if (b === "Yesterday") return 1;
        return new Date(b).getTime() - new Date(a).getTime();
      })
      .forEach((key) => {
        sortedGroups[key] = groups[key].sort(
          (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
        );
      });

    return sortedGroups;
  }, [filteredHistory]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full w-full overflow-auto bg-gradient-to-br from-violet-50 to-indigo-50"
    >
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl font-bold text-violet-900 flex items-center"
          >
            <ClockIcon className="w-8 h-8 mr-3" />
            History
          </motion.h1>

          {history.length > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onClick={onClearHistory}
              className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Clear History
            </motion.button>
          )}
        </div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative mb-6"
        >
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </motion.div>

        {/* History Content */}
        {Object.keys(groupedHistory).length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center py-12"
          >
            <ClockIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">
              {searchTerm ? "No history found" : "No browsing history yet"}
            </h3>
            <p className="text-gray-500">
              {searchTerm ? "Try adjusting your search terms" : "Start browsing to see your history here"}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([date, entries], groupIndex) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + groupIndex * 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">{date}</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {entries.map((entry, entryIndex) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: entryIndex * 0.05 }}
                      className="group flex items-center p-4 hover:bg-gray-50 transition-colors"
                    >
                      {entry.favicon ? (
                        <img
                          src={entry.favicon}
                          alt=""
                          className="w-6 h-6 mr-3 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-6 h-6 mr-3 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">🌐</span>
                        </div>
                      )}

                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => onHistoryClick(entry.url)}
                      >
                        <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-violet-600">
                          {entry.title || entry.url}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">{entry.url}</p>
                        <div className="flex items-center mt-1 text-xs text-gray-400">
                          <span>{new Date(entry.visitedAt).toLocaleTimeString()}</span>
                          {entry.visitCount > 1 && <span className="ml-2">• {entry.visitCount} visits</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => onRemoveHistoryEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
