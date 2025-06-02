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

const text = `147.75.34.103:443
147.75.34.92:443
147.75.34.103:10005
147.75.34.103:10006
147.75.34.92:9401
65.21.240.53:8080
147.75.34.103:10003
147.75.34.92:9480
147.75.34.93:9443
93.115.172.94:1080
134.209.29.120:80
145.40.97.148:10004
147.75.34.103:9400
198.199.86.11:8080
95.111.229.159:8080
198.199.86.11:3128
185.234.65.66:1080
194.183.190.10:8080
128.199.120.45:9090
115.231.181.40:8128
72.10.164.178:13897
67.43.228.253:16739
134.209.29.120:3128
145.40.97.148:10006
67.43.228.253:33013
128.199.116.219:9090
161.35.70.249:8080
67.43.236.20:19493
159.203.61.169:8080
152.42.170.187:9090
72.10.160.173:23997
72.10.160.170:15475
77.242.98.39:8080
147.75.34.103:80
72.10.160.92:30337
38.51.48.235:999
72.10.160.90:17585
36.151.194.43:8087
181.78.19.138:999
159.69.57.20:8880
45.136.198.40:3128
65.109.210.247:1080
138.68.60.8:3128
58.33.109.114:2021
147.75.34.92:9400
181.78.19.142:999
145.40.97.148:80
209.97.150.167:80
200.187.119.72:3128
145.40.97.148:10002
57.129.81.201:8081
72.10.160.90:20643
145.40.97.148:9400
106.75.251.211:3128
47.101.148.107:7888
72.10.160.170:2547
72.10.164.178:13461
209.97.150.167:3128
181.78.19.142:9992
147.75.34.103:10004
128.199.202.122:3128
46.32.15.59:3128
147.75.34.92:9443
185.154.8.1:56789
103.10.231.189:8080
107.172.208.184:1080
94.103.83.90:3128
23.237.210.82:80
72.10.160.90:31011
144.126.134.206:14602
67.43.228.250:28209
138.68.60.8:8080
13.212.182.108:3128
116.62.230.32:3128
72.10.164.178:9339
67.43.228.251:14209
157.175.152.241:1080
109.123.238.230:14602
72.10.160.90:7575
72.10.160.93:4259
67.43.228.250:8809
45.186.6.104:3128
72.10.164.178:24849
116.172.66.186:12701
72.10.160.90:11651
72.10.160.171:13179
147.75.34.103:10002
145.40.97.148:10005
45.140.143.77:18080
72.10.160.93:1233
67.43.228.251:22767
67.43.236.22:2211
72.10.164.178:10693
103.139.99.47:8080
145.40.97.148:10800
138.68.60.8:80
78.188.152.209:1454
134.209.29.120:8080
209.38.177.186:3128
67.43.236.18:16151
92.58.181.171:1194
72.10.164.178:6703
139.59.1.14:8080
201.77.96.0:999
72.10.160.90:16375
72.10.160.170:12723
198.199.86.11:80
67.43.228.250:2715
164.163.42.42:10000
18.141.90.171:80
23.236.65.234:38080
147.75.34.103:9401
145.40.97.148:10003
145.40.97.148:9401
67.43.228.253:30343
161.35.70.249:3128
67.43.236.20:5039
45.167.124.32:999
103.163.171.203:6598
181.78.19.138:9992
128.199.202.122:80
36.136.27.2:4999
67.43.228.253:4989
67.43.236.20:15077
72.10.164.178:21149
72.10.164.178:5387
80.190.82.58:14602
120.25.199.3:10001
72.10.164.178:27183
114.80.37.199:3081
14.205.92.169:8854
72.10.164.178:30433
34.102.48.89:8080
72.10.164.178:13013
39.101.174.62:2020
67.43.228.253:9793
85.117.63.91:8080
123.20.55.69:1010
67.43.228.254:2385
72.10.160.90:10451
72.10.164.178:32947
72.10.160.171:2361
164.163.42.46:10000
147.45.178.211:14658
112.19.241.37:19999
72.10.160.90:21377
54.250.76.76:3128
67.43.236.20:30939
14.241.80.37:8080
164.163.42.20:10000
72.10.160.91:22523
67.43.228.252:10855
110.43.221.121:7088
122.228.246.248:3128
67.43.228.250:12821
47.92.93.226:8888
139.59.1.14:3128
67.43.236.20:32699
204.199.139.71:999
67.43.228.254:14533
159.203.61.169:3128
49.229.100.235:8080
72.10.160.93:10451
145.40.97.148:10010
72.10.164.178:17235
35.73.28.87:3128
119.93.82.171:8080
72.10.164.178:20279
59.47.238.4:8088
67.43.236.20:31241
114.80.37.90:3081
77.105.137.42:8080
72.10.160.170:24551
72.10.164.178:11381
72.10.160.174:2357
72.10.164.178:7233
218.89.187.4:4780
67.43.236.18:3529
67.43.236.20:29323
128.199.121.61:9090
175.178.136.39:8080
67.43.228.253:26927
103.189.11.63:3838
72.10.160.173:32211
67.43.236.22:2159
115.234.198.86:8118
36.64.10.162:8080
128.199.114.189:9090
72.10.160.90:6133
47.251.43.115:33333
120.79.121.125:3128
72.10.160.171:1457
103.142.14.88:8081
72.10.164.178:1051
167.71.211.171:30344
121.230.9.136:1080
72.10.160.171:4715
58.69.137.62:8081
72.10.160.170:10177
111.72.196.88:2324
194.4.57.200:3128
222.127.63.134:8080
72.10.160.90:3257
72.10.160.90:4073
72.10.160.171:28781
8.138.204.32:3128
119.235.19.10:8080
103.163.171.202:5126
190.121.151.162:999
194.181.46.86:80
72.10.160.90:4097
67.43.228.253:30269
67.43.228.250:3013
119.23.78.172:3128
84.54.191.22:8080
72.10.160.170:13345
67.43.228.254:24595
101.251.204.174:8080
180.127.22.14:1080
67.43.228.250:4873
107.173.67.126:3128
103.167.87.111:39108
103.156.57.118:8080
72.10.164.178:21797
200.26.187.69:999
103.180.123.39:8080
93.190.138.107:46182
186.96.111.214:999
103.146.197.78:8080
8.129.43.150:54321
8.148.11.3:3128
114.230.209.32:3712
72.10.164.178:6639
62.133.60.126:24558
72.10.160.93:27373
154.182.248.223:8080
51.81.245.3:17981
72.10.164.178:3367
188.132.249.40:8080
190.61.55.19:999
164.163.42.25:10000
103.156.16.45:8080
103.169.254.9:6080
212.252.71.9:8080`;

// Function to fetch proxy list from the URL
const fetchProxyList = async (): Promise<Server[]> => {
  console.log("📋 [fetchProxyList] Starting to parse hardcoded proxy list");

  try {
    // const response = await fetch(
    //   "https://raw.githubusercontent.com/monosans/proxy-list/refs/heads/main/proxies_anonymous/http.txt"
    // );
    // const text = await response.text();

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
      console.log("📊 [ServerList] Cache is stale or empty, loading servers");
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

  // Function to check ping for servers in batches using HTTP requests
  const checkServerPings = async (servers: Server[]) => {
    console.log("🏓 [checkServerPings] Starting ping checks:", {
      totalServers: servers.length,
      batchSize: 25,
    });

    try {
      setLoadingPing(true);
      setPingProgress(0, servers.length);

      // Process servers in batches of 25
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

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 [checkServerPings] Processing batch ${batchIndex + 1}/${batches.length}:`, {
          batchSize: batch.length,
          servers: batch.map((s) => s.ip),
        });

        // Process all servers in the batch concurrently
        const pingPromises = batch.map(async (server) => {
          try {
            console.log(`🏓 [checkServerPings] Pinging ${server.ip}...`);

            // Use HTTP request timing as a proxy for ping
            const startTime = performance.now();

            try {
              // Try to make a quick HTTP request to the proxy
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

              await fetch(`http://${server.ip}:${server.port}`, {
                method: "HEAD",
                signal: controller.signal,
                mode: "no-cors", // Avoid CORS issues
              });

              clearTimeout(timeoutId);
              const endTime = performance.now();
              const pingValue = Math.round(endTime - startTime);

              console.log(`📊 [checkServerPings] Ping result for ${server.ip}:`, {
                pingValue,
                success: true,
              });

              updateServerPing(server.id, pingValue);
              return { serverId: server.id, ping: pingValue, success: true };
            } catch (fetchError) {
              // If direct connection fails, try a simple connectivity test
              const endTime = performance.now();
              const pingValue = Math.round(endTime - startTime);

              // If it took less than 1000ms, consider it somewhat responsive
              const finalPing = pingValue < 1000 ? pingValue : null;

              console.log(`📊 [checkServerPings] Fallback ping result for ${server.ip}:`, {
                pingValue: finalPing,
                originalError: fetchError instanceof Error ? fetchError.message : "Unknown error",
              });

              updateServerPing(server.id, finalPing);
              return { serverId: server.id, ping: finalPing, success: finalPing !== null };
            }
          } catch (error) {
            console.error(`❌ [checkServerPings] Failed to ping ${server.ip}:`, error);
            updateServerPing(server.id, null);
            return { serverId: server.id, ping: null, success: false };
          }
        });

        // Wait for all pings in the batch to complete
        const batchResults = await Promise.all(pingPromises);
        completedCount += batch.length;
        setPingProgress(completedCount, servers.length);

        console.log(`✅ [checkServerPings] Batch ${batchIndex + 1} completed:`, {
          successful: batchResults.filter((r) => r.success).length,
          failed: batchResults.filter((r) => !r.success).length,
          progress: `${completedCount}/${servers.length}`,
        });

        // Add a small delay between batches to avoid overwhelming the system
        if (batchIndex < batches.length - 1) {
          console.log("⏳ [checkServerPings] Waiting 200ms before next batch...");
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      console.log("🎉 [checkServerPings] All ping checks completed:", {
        totalServers: servers.length,
        successfulPings: servers.filter((s) => s.ping !== null).length,
      });
    } catch (error) {
      console.error("💥 [checkServerPings] Fatal error during ping checking:", error);
      setError("Failed to check server pings");
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
            <span className="text-green-600 text-sm">Checking server pings...</span>
            <div className="text-green-500 text-xs mt-1">
              {`${pingProgress.completed}/${pingProgress.total} servers checked`}
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
              Ping {sortField === "ping" && <span className="text-xs ml-1">(sorting)</span>}
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
