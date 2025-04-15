import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiChevronUp, FiChevronDown } from "react-icons/fi";

interface Server {
  id: string;
  country: string;
  city: string;
  ip: string;
  ping: number;
  load: number;
}

interface ServerListProps {
  onSelect: (server: Server) => void;
  currentServer?: Server;
}

// Dummy data - replace with real server data
const DUMMY_SERVERS: Server[] = [
  { id: "nl1", country: "Netherlands", city: "Amsterdam", ip: "185.93.1.96", ping: 28, load: 65 },
  { id: "us1", country: "United States", city: "New York", ip: "192.168.1.101", ping: 85, load: 45 },
  { id: "jp1", country: "Japan", city: "Tokyo", ip: "192.168.1.102", ping: 120, load: 30 },
  { id: "uk1", country: "United Kingdom", city: "London", ip: "192.168.1.103", ping: 35, load: 70 },
  { id: "de1", country: "Germany", city: "Frankfurt", ip: "192.168.1.104", ping: 40, load: 55 },
  { id: "sg1", country: "Singapore", city: "Singapore", ip: "192.168.1.105", ping: 95, load: 40 },
  { id: "au1", country: "Australia", city: "Sydney", ip: "192.168.1.106", ping: 150, load: 25 },
  { id: "ca1", country: "Canada", city: "Toronto", ip: "192.168.1.107", ping: 75, load: 50 },
];

type SortField = "ping" | "load" | "country";

export function ServerList({ onSelect, currentServer }: ServerListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("ping");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedServers = useMemo(() => {
    return DUMMY_SERVERS.filter((server) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        server.country.toLowerCase().includes(searchLower) ||
        server.city.toLowerCase().includes(searchLower) ||
        server.ip.includes(searchQuery)
      );
    }).sort((a, b) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "country") {
        return multiplier * a.country.localeCompare(b.country);
      }
      return multiplier * (a[sortField] - b[sortField]);
    });
  }, [searchQuery, sortField, sortDirection]);

  const getPingColor = (ping: number) => {
    if (ping < 50) return "text-green-500";
    if (ping < 100) return "text-yellow-500";
    return "text-red-500";
  };

  const getLoadColor = (load: number) => {
    if (load < 50) return "text-green-500";
    if (load < 80) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="p-4 space-y-4">
      {/* Search bar */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by country or IP..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
        />
      </div>

      {/* Server list */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
          <div
            className="col-span-4 flex items-center cursor-pointer"
            onClick={() => handleSort("country")}
          >
            Location
            <span className="ml-1">
              {sortField === "country" && (sortDirection === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
            </span>
          </div>
          <div className="col-span-4">IP Address</div>
          <div
            className="col-span-2 flex items-center cursor-pointer"
            onClick={() => handleSort("ping")}
          >
            Ping
            <span className="ml-1">
              {sortField === "ping" && (sortDirection === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
            </span>
          </div>
          <div
            className="col-span-2 flex items-center cursor-pointer"
            onClick={() => handleSort("load")}
          >
            Load
            <span className="ml-1">
              {sortField === "load" && (sortDirection === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
            </span>
          </div>
        </div>

        {/* Server rows */}
        <div className="max-h-64 overflow-y-auto">
          <AnimatePresence>
            {filteredAndSortedServers.map((server) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 hover:bg-violet-50 cursor-pointer transition-colors ${
                  currentServer?.id === server.id ? "bg-violet-50" : ""
                }`}
                onClick={() => onSelect(server)}
              >
                <div className="col-span-4">
                  <div className="font-medium text-gray-900">{server.country}</div>
                  <div className="text-sm text-gray-500">{server.city}</div>
                </div>
                <div className="col-span-4 flex items-center">
                  <span className="text-sm font-mono text-gray-600">{server.ip}</span>
                </div>
                <div className={`col-span-2 flex items-center font-medium ${getPingColor(server.ping)}`}>
                  {server.ping}ms
                </div>
                <div className={`col-span-2 flex items-center font-medium ${getLoadColor(server.load)}`}>
                  {server.load}%
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
