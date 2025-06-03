import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp, FiRefreshCw, FiSearch, FiCheck, FiX, FiMapPin, FiActivity } from "react-icons/fi";
import { useServerStore } from "../stores/serverStore";

interface Server {
  id: string;
  country: string;
  countryCode?: string;
  city: string;
  ip: string;
  port: number;
  ping: number | null;
  isHealthy: boolean;
  lastChecked: number;
  type: string;
}

interface ServerListProps {
  onSelect: (server: Server) => void;
  currentServer?: Server;
}

// Utility function to convert country code to flag emoji
const getCountryFlag = (countryCode?: string): string => {
  if (!countryCode || countryCode.length !== 2) return "🌐";

  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
};

// Function to fetch healthy proxy list from the external API
const fetchHealthyProxyList = async (): Promise<Server[]> => {
  console.log("📋 [fetchHealthyProxyList] Fetching healthy proxies from external API");

  try {
    const response = await fetch("http://206.188.197.91:5001/api/proxies");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const servers: Server[] = data.proxies.map((proxy: any) => ({
      id: proxy.id,
      country: proxy.country,
      countryCode: proxy.countryCode,
      city: proxy.city,
      ip: proxy.ip,
      port: proxy.port,
      ping: null, // Will be set during latency testing
      isHealthy: proxy.isHealthy,
      lastChecked: proxy.lastChecked,
      type: proxy.type,
    }));

    console.log("✅ [fetchHealthyProxyList] Successfully fetched healthy proxy list:", {
      totalServers: servers.length,
      metadata: data.metadata,
      sampleProxies: servers.slice(0, 3).map((s) => ({ ip: s.ip, country: s.country })),
    });

    return servers;
  } catch (error) {
    console.error("❌ [fetchHealthyProxyList] Failed to fetch healthy proxy list:", error);
    throw error;
  }
};

type SortField = "ping" | "country" | "ip";

export function ServerList({ onSelect, currentServer }: ServerListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("ping");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Use Zustand store - Updated to remove location loading state
  const {
    servers,
    isLoading,
    isLoadingPing,
    pingProgress,
    error,
    setServers,
    setLoading,
    setLoadingPing,
    setPingProgress,
    updateServerPing,
    setError,
    shouldRefetchServers,
  } = useServerStore();

  // Load servers on component mount
  useEffect(() => {
    console.log("🚀 [ServerList] Component mounted, checking if servers need to be loaded");
    if (shouldRefetchServers()) {
      console.log("📊 [ServerList] Cache is stale or empty - loading servers");
      loadServers();
    } else {
      console.log("💾 [ServerList] Using cached servers:", {
        count: servers.length,
        healthyCount: servers.filter((s) => s.isHealthy).length,
      });
    }
  }, []);

  // Function to test proxy latency only (health is already verified by external server)
  const checkServerLatency = async (servers: Server[]) => {
    console.log("🔍 [checkServerLatency] Starting concurrent latency testing for healthy proxies:", {
      totalServers: servers.length,
      concurrency: "All servers tested in parallel with axios",
    });

    // Since contextIsolation is false, we can access electron directly
    const { ipcRenderer } = window.require("electron");

    try {
      setLoadingPing(true);
      setPingProgress(0, servers.length);

      let completedCount = 0;

      // Test all servers concurrently with real-time progress tracking
      const testPromises = servers.map(async (server) => {
        console.log(`🔄 [checkServerLatency] Starting latency test for ${server.ip}:${server.port}`);

        try {
          const testResult = await ipcRenderer.invoke("test-proxy-server", {
            ip: server.ip,
            port: server.port,
            type: server.type,
          });

          // Update progress immediately when this test completes
          completedCount++;
          setPingProgress(completedCount, servers.length);

          if (testResult.success) {
            console.log(`✅ [checkServerLatency] Test successful for ${server.ip}: ${testResult.ping}ms`);
            updateServerPing(server.id, testResult.ping);
            return { serverId: server.id, ping: testResult.ping, success: true };
          } else {
            console.warn(`❌ [checkServerLatency] Test failed for ${server.ip}:`, testResult.error);
            updateServerPing(server.id, null);
            return { serverId: server.id, ping: null, success: false };
          }
        } catch (error) {
          // Update progress even for failed tests
          completedCount++;
          setPingProgress(completedCount, servers.length);

          console.error(`💥 [checkServerLatency] Error testing latency for ${server.ip}:`, error);
          updateServerPing(server.id, null);
          return { serverId: server.id, ping: null, success: false };
        }
      });

      // Wait for all tests to complete
      const results = await Promise.allSettled(testPromises);

      const successfulTests = results.filter((result) => result.status === "fulfilled" && result.value.success).length;

      console.log("🎉 [checkServerLatency] Concurrent latency testing completed:", {
        totalServers: servers.length,
        successfulTests,
        failedTests: servers.length - successfulTests,
        testingMethod: "All servers tested simultaneously with axios - much faster!",
      });
    } catch (error) {
      console.error("💥 [checkServerLatency] Fatal error during latency testing:", error);
      setError("Failed to test proxy server latency");
    } finally {
      setLoadingPing(false);
    }
  };

  const loadServers = async () => {
    console.log("🔄 [loadServers] Starting server loading process");
    setLoading(true);
    setError(null);

    try {
      console.log("📋 [loadServers] Fetching healthy proxy list from external API...");
      const healthyProxies = await fetchHealthyProxyList();
      console.log("📊 [loadServers] Healthy proxy list fetched, updating store...");
      setServers(healthyProxies);

      console.log("🏁 [loadServers] Server loading process complete, starting latency testing...");
      // Start latency testing after servers are displayed
      checkServerLatency(healthyProxies);
    } catch (err) {
      const errorMessage = "Failed to load healthy proxy servers from external API";
      console.error("💥 [loadServers] Server loading failed:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedServers = useMemo(() => {
    return servers
      .filter((server) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          server.country.toLowerCase().includes(searchLower) ||
          server.city.toLowerCase().includes(searchLower) ||
          server.ip.includes(searchQuery) ||
          server.port.toString().includes(searchQuery)
        );
      })
      .sort((a, b) => {
        const multiplier = sortDirection === "asc" ? 1 : -1;
        if (sortField === "country") {
          return multiplier * a.country.localeCompare(b.country);
        }
        if (sortField === "ip") {
          return multiplier * a.ip.localeCompare(b.ip);
        }
        if (sortField === "ping") {
          // Special handling for ping to prioritize servers with actual values
          const aPing = a.ping;
          const bPing = b.ping;

          // If both have ping values, sort by ping value
          if (aPing !== null && bPing !== null) {
            return multiplier * (aPing - bPing);
          }

          // If only one has a ping value, prioritize it
          if (aPing !== null && bPing === null) {
            return -1; // a comes first regardless of sort direction
          }
          if (aPing === null && bPing !== null) {
            return 1; // b comes first regardless of sort direction
          }

          // If both are null, maintain original order (or sort by IP as fallback)
          return a.ip.localeCompare(b.ip);
        }
        return 0;
      });
  }, [servers, searchQuery, sortField, sortDirection]);

  // Calculate detailed statistics
  const statistics = useMemo(() => {
    const totalServers = servers.length;
    const healthyServers = servers.filter((server) => server.ping !== null);
    const discardedServers = servers.filter((server) => server.ping === null);
    // Since all servers from external API have valid location data, we don't need to filter by N/A
    const serversWithLocation = servers.length; // All servers have location data from the API
    const averagePing =
      healthyServers.length > 0
        ? Math.round(healthyServers.reduce((sum, server) => sum + (server.ping || 0), 0) / healthyServers.length)
        : 0;

    return {
      total: totalServers,
      healthy: healthyServers.length,
      discarded: discardedServers.length,
      withLocation: serversWithLocation,
      locationSuccessRate: 100, // Always 100% since external API provides location data
      healthyRate: totalServers > 0 ? Math.round((healthyServers.length / totalServers) * 100) : 0,
      averagePing,
    };
  }, [servers]);

  const getPingColor = (ping: number | null) => {
    if (ping === null) return "text-gray-400";
    if (ping <= 1000) return "text-green-500"; // Excellent
    if (ping <= 1500) return "text-orange-500"; // Fair
    if (ping <= 2000) return "text-yellow-500"; // Good
    return "text-blue-500"; // Decent (2000+ms)
  };

  const handleRefresh = () => {
    console.log("🔄 [handleRefresh] Manual refresh triggered");
    loadServers();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Statistics Cards */}
      {!isLoading && servers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-xs font-medium uppercase tracking-wide">Total Servers</p>
                <p className="text-2xl font-bold text-blue-800">{statistics.total}</p>
              </div>
              <FiActivity className="w-6 h-6 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-xs font-medium uppercase tracking-wide">Healthy</p>
                <p className="text-2xl font-bold text-green-800">{statistics.healthy}</p>
                <p className="text-xs text-green-600">{statistics.healthyRate}% success</p>
              </div>
              <FiCheck className="w-6 h-6 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-red-50 to-red-100 p-3 rounded-lg border border-red-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-xs font-medium uppercase tracking-wide">No Ping Data</p>
                <p className="text-2xl font-bold text-red-800">{statistics.discarded}</p>
                <p className="text-xs text-red-600">Failed latency test</p>
              </div>
              <FiX className="w-6 h-6 text-red-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-xs font-medium uppercase tracking-wide">Avg Ping</p>
                <p className="text-2xl font-bold text-purple-800">{statistics.averagePing}ms</p>
                <p className="text-xs text-purple-600">{statistics.withLocation} with location</p>
              </div>
              <FiMapPin className="w-6 h-6 text-purple-500" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Search bar and refresh button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by IP, port, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
          />
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          title="Refresh proxy list"
        >
          <FiRefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <FiRefreshCw className="w-6 h-6 animate-spin text-violet-600 mr-2" />
          <span className="text-gray-600">Loading proxy servers...</span>
        </div>
      )}

      {/* Loading ping state */}
      {!isLoading && isLoadingPing && (
        <div className="flex items-center justify-center py-4 bg-green-50 rounded-lg">
          <FiRefreshCw className="w-4 h-4 animate-spin text-green-600 mr-2" />
          <div className="flex flex-col items-center">
            <span className="text-green-600 text-sm">Testing proxy server latency...</span>
            <div className="text-green-500 text-xs mt-1">
              {`${pingProgress.completed}/${pingProgress.total} servers tested`}
            </div>
            <div className="w-48 bg-green-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${pingProgress.total > 0 ? (pingProgress.completed / pingProgress.total) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-center py-8 text-red-600">
          <span>{error}</span>
          <button
            onClick={handleRefresh}
            className="ml-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Server list */}
      {!isLoading && !error && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          {/* Header - Updated to remove Load column and adjust grid */}
          <div className="grid grid-cols-10 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
            <div
              className="col-span-3 flex items-center cursor-pointer"
              onClick={() => handleSort("country")}
            >
              Location
              <span className="ml-1">
                {sortField === "country" && (sortDirection === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
              </span>
            </div>
            <div
              className="col-span-4 flex items-center cursor-pointer"
              onClick={() => handleSort("ip")}
            >
              IP Address
              <span className="ml-1">
                {sortField === "ip" && (sortDirection === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
              </span>
            </div>
            <div className="col-span-1">Port</div>
            <div
              className={`col-span-2 flex items-center cursor-pointer ${
                sortField === "ping" ? "text-violet-600 font-semibold" : ""
              }`}
              onClick={() => handleSort("ping")}
            >
              Ping
              <span className="ml-1">
                {sortField === "ping" && (sortDirection === "asc" ? <FiChevronUp /> : <FiChevronDown />)}
              </span>
            </div>
          </div>

          {/* Server rows - Updated to remove Load column and adjust grid */}
          <div className="max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredAndSortedServers.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  No proxy servers found matching your search.
                </div>
              ) : (
                filteredAndSortedServers.map((server) => (
                  <motion.div
                    key={server.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`grid grid-cols-10 gap-4 px-4 py-3 border-b border-gray-100 hover:bg-violet-50 cursor-pointer transition-colors ${
                      currentServer?.id === server.id ? "bg-violet-50" : ""
                    }`}
                    onClick={() => onSelect(server)}
                  >
                    <div className="col-span-3">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        <span className="text-lg">{getCountryFlag(server.countryCode)}</span>
                        <span>{server.country}</span>
                      </div>
                      <div className="text-sm text-gray-500">{server.city}</div>
                    </div>
                    <div className="col-span-4 flex items-center">
                      <span className="text-sm font-mono text-gray-600">{server.ip}</span>
                    </div>
                    <div className="col-span-1 flex items-center">
                      <span className="text-sm font-mono text-gray-600">{server.port}</span>
                    </div>
                    <div className={`col-span-2 flex items-center font-medium ${getPingColor(server.ping)}`}>
                      {isLoadingPing && server.ping === null ? (
                        <FiRefreshCw className="w-3 h-3 animate-spin text-gray-400" />
                      ) : server.ping !== null ? (
                        `${server.ping}ms`
                      ) : (
                        "N/A"
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
