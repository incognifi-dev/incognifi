import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiChevronUp, FiChevronDown, FiRefreshCw } from "react-icons/fi";
import { useServerStore } from "../stores/serverStore";

interface Server {
  id: string;
  country: string;
  countryCode?: string;
  city: string;
  ip: string;
  port: number;
  ping: number | null;
  load: number | null;
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

// Function to fetch proxy list from the URL
const fetchProxyList = async (): Promise<Server[]> => {
  console.log("📋 [fetchProxyList] Starting to parse hardcoded proxy list");

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/monosans/proxy-list/refs/heads/main/proxies_anonymous/http.txt"
    );
    const text = await response.text();

    const servers: Server[] = text
      .split("\n")
      .filter((line) => line.trim() && line.includes(":"))
      .map((line, index) => {
        const [ip, portStr] = line.trim().split(":");
        const port = parseInt(portStr, 10);

        return {
          id: `proxy_${index}`,
          country: "N/A",
          countryCode: undefined,
          city: "N/A",
          ip,
          port,
          ping: null,
          load: null,
        };
      });

    console.log("✅ [fetchProxyList] Successfully parsed proxy list:", {
      totalServers: servers.length,
      sampleIPs: servers.slice(0, 5).map((s) => s.ip),
    });

    return servers;
  } catch (error) {
    console.error("❌ [fetchProxyList] Failed to fetch proxy list:", error);
    return [];
  }
};

type SortField = "ping" | "load" | "country" | "ip";

export function ServerList({ onSelect, currentServer }: ServerListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("ping");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Use Zustand store - Updated to include ping-related state
  const {
    servers,
    isLoading,
    isLoadingLocations,
    isLoadingPing,
    pingProgress,
    error,
    setServers,
    setLoading,
    setLoadingLocations,
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
        hasLocations: servers.some((s) => s.country !== "N/A"),
      });
    }
  }, []);

  // Function to fetch location data in batches
  const fetchLocationData = async (servers: Server[]): Promise<Server[]> => {
    console.log("🌍 [fetchLocationData] Starting location fetch process:", {
      totalServers: servers.length,
      uniqueIPs: [...new Set(servers.map((s) => s.ip))].length,
    });

    try {
      setLoadingLocations(true);

      // Extract unique IP addresses
      const ipAddresses = [...new Set(servers.map((server) => server.ip))];
      console.log("🔍 [fetchLocationData] Extracted unique IPs:", ipAddresses.length);

      // Split into batches of 100 (API limit)
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < ipAddresses.length; i += batchSize) {
        batches.push(ipAddresses.slice(i, i + batchSize));
      }

      console.log("📦 [fetchLocationData] Split into batches:", {
        totalBatches: batches.length,
        batchSize,
        batchSizes: batches.map((b) => b.length),
      });

      const locationMap = new Map<string, any>();

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 [fetchLocationData] Processing batch ${batchIndex + 1}/${batches.length}:`, {
          batchSize: batch.length,
          firstIP: batch[0],
          lastIP: batch[batch.length - 1],
        });

        try {
          const response = await fetch("http://ip-api.com/batch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(batch),
          });

          if (response.ok) {
            const locationData = await response.json();
            console.log(`✅ [fetchLocationData] Batch ${batchIndex + 1} successful:`, {
              received: locationData.length,
              successful: locationData.filter((d: any) => d.status === "success" || d.country).length,
            });

            // Map the results back to IP addresses
            locationData.forEach((data: any, index: number) => {
              const ip = batch[index];
              if (data && (data.status === "success" || data.country)) {
                locationMap.set(ip, data);
                console.log(`📍 [fetchLocationData] Mapped location for ${ip}:`, {
                  country: data.country,
                  countryCode: data.countryCode,
                  city: data.city,
                  status: data.status,
                });
              } else {
                console.warn(`⚠️ [fetchLocationData] No location data for ${ip}:`, data);
              }
            });
          } else {
            console.error(`❌ [fetchLocationData] Batch ${batchIndex + 1} failed:`, {
              status: response.status,
              statusText: response.statusText,
            });
          }

          // Add a small delay between batches to respect rate limits
          if (batchIndex < batches.length - 1) {
            console.log("⏳ [fetchLocationData] Waiting 1 second before next batch...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (batchError) {
          console.error(`❌ [fetchLocationData] Batch ${batchIndex + 1} error:`, batchError);
        }
      }

      console.log("🎯 [fetchLocationData] Location mapping complete:", {
        totalMapped: locationMap.size,
        totalServers: servers.length,
      });

      // Update servers with location data
      const updatedServers = servers.map((server) => {
        const locationData = locationMap.get(server.ip);
        if (locationData) {
          const updatedServer = {
            ...server,
            country: locationData.country || locationData.countryCode || "Unknown",
            countryCode: locationData.countryCode || undefined,
            city: locationData.city || "Unknown",
          };
          console.log(`🏷️ [fetchLocationData] Updated server ${server.ip}:`, {
            before: { country: server.country, city: server.city },
            after: { country: updatedServer.country, countryCode: updatedServer.countryCode, city: updatedServer.city },
          });
          return updatedServer;
        }
        return server;
      });

      const locationsFound = updatedServers.filter((s) => s.country !== "N/A" && s.country !== "Unknown").length;
      console.log("🎉 [fetchLocationData] Location fetching complete:", {
        totalServers: updatedServers.length,
        locationsFound,
        successRate: `${Math.round((locationsFound / updatedServers.length) * 100)}%`,
      });

      return updatedServers;
    } catch (error) {
      console.error("💥 [fetchLocationData] Fatal error during location fetching:", error);
      return servers;
    } finally {
      setLoadingLocations(false);
    }
  };

  // Function to test proxy servers in batches by actually proxying web requests
  const checkServerPings = async (servers: Server[]) => {
    console.log("🔍 [checkServerPings] Starting proxy health checks:", {
      totalServers: servers.length,
      batchSize: 25, // Increased batch size since httpbin has no rate limits
    });

    // Since contextIsolation is false, we can access electron directly
    const { ipcRenderer } = window.require("electron");

    try {
      setLoadingPing(true);
      setPingProgress(0, servers.length);

      // Process servers in larger batches since httpbin.org has no rate limits
      const batchSize = 25;
      const batches = [];
      for (let i = 0; i < servers.length; i += batchSize) {
        batches.push(servers.slice(i, i + batchSize));
      }

      console.log("📦 [checkServerPings] Split into batches:", {
        totalBatches: batches.length,
        batchSize,
        batchSizes: batches.map((b) => b.length),
      });

      let completedCount = 0;
      const workingServers: string[] = []; // Track servers that successfully proxy

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 [checkServerPings] Testing batch ${batchIndex + 1}/${batches.length}:`, {
          batchSize: batch.length,
          servers: batch.map((s) => s.ip),
        });

        // Process all servers in the batch concurrently
        const testPromises = batch.map(async (server) => {
          try {
            console.log(`🌐 [checkServerPings] Testing proxy functionality for ${server.ip}:${server.port}...`);

            // Test the proxy server by trying to fetch a test website through it
            const testResult = await ipcRenderer.invoke("test-proxy-server", {
              ip: server.ip,
              port: server.port,
              type: "http", // Most proxies in our list are HTTP proxies
            });

            if (testResult.success) {
              console.log(`✅ [checkServerPings] Proxy test successful for ${server.ip}:`, {
                ping: testResult.ping,
                success: true,
              });

              updateServerPing(server.id, testResult.ping);
              workingServers.push(server.id);
              return { serverId: server.id, ping: testResult.ping, success: true };
            } else {
              console.warn(`❌ [checkServerPings] Proxy test failed for ${server.ip}:`, {
                error: testResult.error,
                success: false,
              });

              // Don't update ping for failed servers - they'll be filtered out
              return { serverId: server.id, ping: null, success: false };
            }
          } catch (error) {
            console.error(`💥 [checkServerPings] Error testing proxy ${server.ip}:`, error);
            return { serverId: server.id, ping: null, success: false };
          }
        });

        // Wait for all tests in the batch to complete
        const batchResults = await Promise.all(testPromises);
        completedCount += batch.length;
        setPingProgress(completedCount, servers.length);

        console.log(`✅ [checkServerPings] Batch ${batchIndex + 1} completed:`, {
          successful: batchResults.filter((r) => r.success).length,
          failed: batchResults.filter((r) => !r.success).length,
          progress: `${completedCount}/${servers.length}`,
        });

        // Minimal delay between batches since httpbin.org has no rate limits
        if (batchIndex < batches.length - 1) {
          console.log("⏳ [checkServerPings] Waiting 500ms before next batch...");
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Get the current servers from the store (which have updated ping values)
      // and filter out non-working servers
      const { servers: currentServers } = useServerStore.getState();
      const workingServerList = currentServers.filter((server) => workingServers.includes(server.id));

      console.log("🎉 [checkServerPings] Proxy health checks completed:", {
        totalServers: servers.length,
        workingServers: workingServerList.length,
        removedServers: servers.length - workingServerList.length,
        successRate: `${Math.round((workingServerList.length / servers.length) * 100)}%`,
      });

      // Only keep the working servers with their updated ping values
      setServers(workingServerList);
    } catch (error) {
      console.error("💥 [checkServerPings] Fatal error during proxy health checking:", error);
      setError("Failed to test proxy server health");
    } finally {
      setLoadingPing(false);
    }
  };

  const loadServers = async () => {
    console.log("🔄 [loadServers] Starting server loading process");
    setLoading(true);
    setError(null);

    try {
      console.log("📋 [loadServers] Fetching proxy list...");
      const proxyList = await fetchProxyList();
      console.log("📊 [loadServers] Proxy list fetched, updating store...");
      setServers(proxyList);

      console.log("🌍 [loadServers] Starting location data fetch...");
      const serversWithLocations = await fetchLocationData(proxyList);
      console.log("✅ [loadServers] Updating store with location data...");
      setServers(serversWithLocations);

      console.log("🏁 [loadServers] Server loading process complete, starting ping checks...");
      // Start ping checks after location data is loaded and servers are displayed
      checkServerPings(serversWithLocations);
    } catch (err) {
      const errorMessage = "Failed to load proxy servers";
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
        if (sortField === "load") {
          // Handle null values for load
          const aVal = a[sortField] ?? Number.MAX_VALUE;
          const bVal = b[sortField] ?? Number.MAX_VALUE;
          return multiplier * (aVal - bVal);
        }
        return 0;
      });
  }, [servers, searchQuery, sortField, sortDirection]);

  const getPingColor = (ping: number | null) => {
    if (ping === null) return "text-gray-400";
    if (ping < 50) return "text-green-500";
    if (ping < 100) return "text-yellow-500";
    return "text-red-500";
  };

  const getLoadColor = (load: number | null) => {
    if (load === null) return "text-gray-400";
    if (load < 50) return "text-green-500";
    if (load < 80) return "text-yellow-500";
    return "text-red-500";
  };

  const handleRefresh = () => {
    console.log("🔄 [handleRefresh] Manual refresh triggered");
    loadServers();
  };

  return (
    <div className="p-4 space-y-4">
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

      {/* Loading locations state */}
      {!isLoading && isLoadingLocations && (
        <div className="flex items-center justify-center py-4 bg-blue-50 rounded-lg">
          <FiRefreshCw className="w-4 h-4 animate-spin text-blue-600 mr-2" />
          <span className="text-blue-600 text-sm">Fetching server locations...</span>
        </div>
      )}

      {/* Loading ping state */}
      {!isLoading && !isLoadingLocations && isLoadingPing && (
        <div className="flex items-center justify-center py-4 bg-green-50 rounded-lg">
          <FiRefreshCw className="w-4 h-4 animate-spin text-green-600 mr-2" />
          <div className="flex flex-col items-center">
            <span className="text-green-600 text-sm">Testing proxy server health...</span>
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
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
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
                    className={`grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 hover:bg-violet-50 cursor-pointer transition-colors ${
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
                    <div className={`col-span-2 flex items-center font-medium ${getLoadColor(server.load)}`}>
                      {server.load !== null ? `${server.load}%` : "N/A"}
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
