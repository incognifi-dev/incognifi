import React from "react";
import { FiClock, FiTrash2, FiSearch, FiX } from "react-icons/fi";
import { HistoryEntry } from "../types";

interface HistoryPageProps {
  history: HistoryEntry[];
  onHistoryClick: (url: string) => void;
  onRemoveEntry: (id: string) => void;
  onClearHistory: () => void;
}

export function HistoryPage({ history, onHistoryClick, onRemoveEntry, onClearHistory }: HistoryPageProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filteredHistory, setFilteredHistory] = React.useState(history);

  React.useEffect(() => {
    const filtered = history.filter(
      (entry) =>
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredHistory(filtered);
  }, [history, searchQuery]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const groupedHistory = React.useMemo(() => {
    const groups: { [key: string]: HistoryEntry[] } = {};

    filteredHistory.forEach((entry) => {
      const date = entry.visitedAt.toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    // Sort groups by date (most recent first)
    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, entries]) => ({
        date: new Date(date),
        entries: entries.sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime()),
      }));
  }, [filteredHistory]);

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 animate-slide-down">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 animate-fade-in animate-delay-200">Browsing History</h1>

        {/* Search and Clear */}
        <button
          onClick={onClearHistory}
          className="mb-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 hover-scale animate-fade-in animate-delay-300"
        >
          <FiTrash2 className="w-4 h-4" />
          <span>Clear All History</span>
        </button>

        {/* Search */}
        <div className="relative animate-fade-in animate-delay-400">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 animate-fade-in animate-delay-500">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 animate-scale-in animate-delay-600">
            <FiClock className="w-16 h-16 mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">{searchQuery ? "No results found" : "No browsing history"}</h2>
            <p className="text-center max-w-md">
              {searchQuery
                ? "Try adjusting your search terms or browse some websites to build your history."
                : "Start browsing the web and your history will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedHistory.map(({ date, entries }, groupIndex) => (
              <div
                key={date.toDateString()}
                className="animate-fade-in"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4 sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 py-2 -mx-6 px-6">
                  {date.toDateString() === new Date().toDateString()
                    ? "Today"
                    : date.toDateString() === new Date(Date.now() - 86400000).toDateString()
                    ? "Yesterday"
                    : date.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                      })}
                </h3>

                <div className="grid gap-3">
                  {entries.map((entry, entryIndex) => (
                    <div
                      key={entry.id}
                      className="group bg-white rounded-lg border border-gray-200 hover:border-violet-300 hover:shadow-md transition-all cursor-pointer overflow-hidden animate-slide-up"
                      style={{ animationDelay: `${groupIndex * 100 + entryIndex * 50}ms` }}
                      onClick={() => onHistoryClick(entry.url)}
                    >
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          {/* Favicon */}
                          <div className="flex-shrink-0">
                            {entry.favicon ? (
                              <img
                                src={entry.favicon}
                                alt=""
                                className="w-6 h-6 rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center">
                                <FiClock className="w-3 h-3 text-gray-500" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{entry.title}</h4>
                            <p className="text-sm text-gray-500 truncate">{entry.url}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-400">{formatDate(entry.visitedAt)}</span>
                              {entry.visitCount > 1 && (
                                <span className="text-xs text-violet-600 bg-violet-100 px-2 py-1 rounded-full">
                                  {entry.visitCount} visits
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveEntry(entry.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Remove from history"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
