import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { FiActivity, FiCheck, FiRefreshCw, FiSettings, FiX, FiInfo, FiShield, FiMapPin } from "react-icons/fi";
import { useVPNStore } from "../stores/vpnStore";
import { ServerList } from "./ServerList";

// Since contextIsolation is false, we can access electron directly
const { ipcRenderer } = window.require("electron");

interface VPNDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProxyConfigType {
  enabled: boolean;
  host: string;
  port: number;
  type: "socks5" | "socks4" | "http";
  username?: string;
  password?: string;
}

export function VPNDropdown({ isOpen, onClose }: VPNDropdownProps) {
  // Use VPN store instead of local state
  const { vpnState, setCurrentServer, setConnectionStatus } = useVPNStore();

  const [isLoading, setIsLoading] = React.useState(false);
  const [showServerList, setShowServerList] = React.useState(false);
  const [hasAutoOpened, setHasAutoOpened] = React.useState(false);

  // Proxy configuration state
  const [proxyConfig, setProxyConfig] = React.useState<ProxyConfigType>({
    enabled: false,
    host: "pr.oxylabs.io",
    port: 7777,
    type: "http",
  });
  const [proxyMessage, setProxyMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Live latency monitoring state
  const [currentLatency, setCurrentLatency] = React.useState<number | null>(null);
  const [latencyMeasurements, setLatencyMeasurements] = React.useState<number[]>([]);
  const [isCheckingLatency, setIsCheckingLatency] = React.useState(false);
  const [latencyInterval, setLatencyInterval] = React.useState<NodeJS.Timeout | null>(null);

  // Auto-open server list when dropdown first opens
  React.useEffect(() => {
    if (isOpen && !hasAutoOpened) {
      setShowServerList(true);
      setHasAutoOpened(true);
    }
  }, [isOpen, hasAutoOpened]);

  const toggleConnection = async () => {
    if (vpnState.isConnected) {
      // When disconnecting, disable the proxy as well
      setIsLoading(true);

      try {
        // Disable proxy first
        const updatedProxyConfig = {
          ...proxyConfig,
          enabled: false,
        };

        setProxyConfig(updatedProxyConfig);

        // Save the disabled proxy configuration
        const result = await ipcRenderer.invoke("set-proxy-config", updatedProxyConfig);

        if (result.success) {
          setProxyMessage({ type: "success", text: "Proxy disconnected" });
          setTimeout(() => setProxyMessage(null), 3000);

          // Refresh the current tab to use direct connection
          await ipcRenderer.invoke("refresh-current-tab");
        }

        // Immediate disconnect
        setConnectionStatus(false);
      } catch (error) {
        setProxyMessage({ type: "error", text: "Failed to disable proxy" });
        // Still disconnect VPN even if proxy disable fails
        setConnectionStatus(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      // When connecting, enable the proxy as well
      setIsLoading(true);

      try {
        // Enable proxy first
        const updatedProxyConfig = {
          ...proxyConfig,
          enabled: true,
        };

        setProxyConfig(updatedProxyConfig);

        // Save the enabled proxy configuration
        const result = await ipcRenderer.invoke("set-proxy-config", updatedProxyConfig);

        if (result.success) {
          setProxyMessage({ type: "success", text: "Proxy connected" });
          setTimeout(() => setProxyMessage(null), 3000);

          // Refresh the current tab to use proxy connection
          await ipcRenderer.invoke("refresh-current-tab");
        }

        // Simulate connection delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Connect VPN
        setConnectionStatus(true);
      } catch (error) {
        setProxyMessage({ type: "error", text: "Failed to enable proxy" });
        // Still connect VPN even if proxy enable fails
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setConnectionStatus(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleServerSelect = async (server: any) => {
    setShowServerList(false);

    // If it's a residential server configuration
    if (server.type === "oxylabs-residential" && server.oxylabsConfig) {
      setIsLoading(true);

      try {
        // First, save the configuration to actually update the proxy settings
        const saveResult = await ipcRenderer.invoke("save-oxylabs-config", server.oxylabsConfig);

        if (!saveResult.success) {
          setProxyMessage({ type: "error", text: `Failed to configure proxy: ${saveResult.message}` });
          return;
        }

        // Update VPN state with new server info
        setCurrentServer({
          id: server.id,
          country: server.country,
          countryCode: server.countryCode,
          city: server.city,
          ip: server.ip,
          port: server.port,
          ping: null,
          isHealthy: true,
          lastChecked: Date.now(),
          type: server.type,
        });

        // Enable connection
        setConnectionStatus(true);

        setProxyMessage({
          type: "success",
          text: `Successfully switched to ${server.country}`,
        });
        setTimeout(() => setProxyMessage(null), 3000);

        // Refresh the current tab to use the new proxy
        await ipcRenderer.invoke("refresh-current-tab");

        // Simulate server switch delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        setProxyMessage({ type: "error", text: "Failed to configure proxy" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Live latency monitoring function
  const checkCurrentServerLatency = async () => {
    if (!vpnState.isConnected || vpnState.currentServer.type !== "oxylabs-residential") {
      setCurrentLatency(null);
      return;
    }

    setIsCheckingLatency(true);

    try {
      const startTime = Date.now();
      const testResult = await ipcRenderer.invoke("test-proxy-connection");
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      if (testResult.success) {
        // Add the new measurement to our array
        setLatencyMeasurements((prev) => {
          const newMeasurements = [...prev, totalTime];
          // Keep only the last 5 measurements for efficiency
          const trimmedMeasurements = newMeasurements.slice(-5);

          // Calculate average of all measurements
          const average = Math.round(
            trimmedMeasurements.reduce((sum, val) => sum + val, 0) / trimmedMeasurements.length
          );

          // Update the current latency with the average
          setCurrentLatency(average);

          return trimmedMeasurements;
        });
      } else {
        if (latencyMeasurements.length === 0) {
          setCurrentLatency(999);
        }
      }
    } catch (error) {
      if (latencyMeasurements.length === 0) {
        setCurrentLatency(999);
      }
    } finally {
      setIsCheckingLatency(false);
    }
  };

  // Start/stop live latency monitoring
  React.useEffect(() => {
    if (vpnState.isConnected && isOpen && vpnState.currentServer.type === "oxylabs-residential") {
      // Reset measurements and latency when dropdown opens
      setLatencyMeasurements([]);
      setCurrentLatency(null);

      // Initial check immediately
      checkCurrentServerLatency();

      // Set up periodic checking every 15 seconds (reduced from 5 seconds)
      const interval = setInterval(() => {
        checkCurrentServerLatency();
      }, 15000);

      setLatencyInterval(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      // Clear interval and reset measurements when disconnected or dropdown closed
      if (latencyInterval) {
        clearInterval(latencyInterval);
        setLatencyInterval(null);
      }
      setLatencyMeasurements([]);
      setCurrentLatency(null);
    }
  }, [vpnState.isConnected, isOpen, vpnState.currentServer.type]);

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (latencyInterval) {
        clearInterval(latencyInterval);
      }
    };
  }, [latencyInterval]);

  const getLatencyColor = (latency: number | null) => {
    if (latency === null) return "text-gray-400";
    if (latency >= 999 && latency < 1000) return "text-gray-500";
    if (latency <= 1000) return "text-green-500";
    if (latency <= 1500) return "text-orange-500";
    if (latency <= 2000) return "text-yellow-500";
    return "text-blue-500";
  };

  const getLatencyStatus = (latency: number | null) => {
    if (latency === null) return "Unknown";
    if (latency >= 999 && latency < 1000) return "Connection Issues";
    if (latency <= 1000) return "Excellent";
    if (latency <= 1500) return "Fair";
    if (latency <= 2000) return "Good";
    return "Decent";
  };

  const getLatencyDotColor = (latency: number | null): string => {
    if (latency === null) return "rgb(156 163 175)";
    if (latency >= 999 && latency < 1000) return "rgb(156 163 175)";
    if (latency <= 1000) return "rgb(34 197 94)";
    if (latency <= 1500) return "rgb(249 115 22)";
    if (latency <= 2000) return "rgb(234 179 8)";
    return "rgb(59 130 246)";
  };

  const getDropdownWidth = () => {
    if (showServerList) return 800;
    return 600;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-[100]"
            onClick={onClose}
          />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -20, width: 320 }}
            animate={{
              opacity: 1,
              y: 0,
              width: getDropdownWidth(),
              transition: {
                width: { type: "spring", stiffness: 300, damping: 30 },
              },
            }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed mt-10 bg-white rounded-xl shadow-xl overflow-hidden z-[101] max-h-[80vh] flex flex-col"
            style={{ top: "0", left: "1rem" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">VPN Connection</h3>
                <div className="flex items-center space-x-2">
                  <motion.div
                    animate={{
                      scale: vpnState.isConnected ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <FiActivity className={`w-5 h-5 ${vpnState.isConnected ? "text-green-400" : "text-red-400"}`} />
                  </motion.div>
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <FiX className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {showServerList ? (
                  <motion.div
                    key="server-list"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="flex flex-col min-h-[400px]"
                  >
                    <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
                      <h4 className="font-medium text-gray-700">Configure VPN</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <ServerList onSelect={handleServerSelect} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="main-content"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    className="p-4 overflow-y-auto"
                  >
                    {/* Status */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-600">Status</span>
                      <motion.span
                        key={vpnState.isConnected ? "connected" : "disconnected"}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`font-medium ${vpnState.isConnected ? "text-green-500" : "text-red-500"}`}
                      >
                        {vpnState.isConnected ? "Connected" : "Disconnected"}
                      </motion.span>
                    </div>

                    {/* Live Latency */}
                    {vpnState.isConnected && vpnState.currentServer.type === "oxylabs-residential" && (
                      <div className="space-y-4 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Live Latency</span>
                          <div className="flex items-center">
                            {isCheckingLatency ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="mr-3"
                              >
                                <FiRefreshCw className="w-4 h-4 text-violet-600" />
                              </motion.div>
                            ) : (
                              <motion.div
                                animate={{
                                  scale: currentLatency !== null ? [1, 1.2, 1] : 1,
                                  opacity: currentLatency !== null ? [0.5, 1, 0.5] : 1,
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                                style={{
                                  width: "12px",
                                  height: "12px",
                                  borderRadius: "50%",
                                  backgroundColor: getLatencyDotColor(currentLatency),
                                }}
                                className="mr-3"
                              />
                            )}
                            <div className="text-right">
                              <span className={`font-medium ${getLatencyColor(currentLatency)}`}>
                                {currentLatency !== null ? `${currentLatency}ms` : "N/A"}
                              </span>
                              <div className={`text-xs ${getLatencyColor(currentLatency)}`}>
                                {getLatencyStatus(currentLatency)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Server Info */}
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Location</span>
                          <span className="font-medium text-gray-800">
                            {vpnState.currentServer.city}, {vpnState.currentServer.country}
                          </span>
                        </div>

                        {/* Proxy Endpoint */}
                        {/* <div className="flex items-center justify-between">
                          <span className="text-gray-600">Proxy Endpoint</span>
                          <span className="font-medium text-gray-800">
                            {vpnState.currentServer.ip}:{vpnState.currentServer.port}
                          </span>
                        </div> */}
                      </div>
                    )}

                    {/* Message Display */}
                    <AnimatePresence>
                      {proxyMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`mb-4 p-3 rounded-lg ${
                            proxyMessage.type === "success"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          <div className="flex items-center">
                            {proxyMessage.type === "success" ? (
                              <FiCheck className="w-4 h-4 mr-2" />
                            ) : (
                              <FiX className="w-4 h-4 mr-2" />
                            )}
                            {proxyMessage.text}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Information Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border border-blue-200"
                    >
                      <div className="flex items-start space-x-3">
                        <FiInfo className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-semibold text-blue-800 mb-1 flex items-center">
                              <FiShield className="w-4 h-4 mr-1" />
                              Premium Residential Network
                            </h4>
                            <p className="text-xs text-blue-700 leading-relaxed">
                              Access to millions of residential IP addresses worldwide with high success rates and
                              automatic rotation.
                            </p>
                          </div>

                          <div className="border-t border-blue-200 pt-3">
                            <h4 className="text-sm font-semibold text-blue-800 mb-1 flex items-center">
                              <FiMapPin className="w-4 h-4 mr-1" />
                              Country Targeting
                            </h4>
                            <p className="text-xs text-blue-700 leading-relaxed">
                              Your connection is routed through residential proxies in your selected country for optimal
                              geo-targeting and performance.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <button
                        onClick={toggleConnection}
                        disabled={isLoading}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors relative ${
                          isLoading
                            ? "bg-violet-400 text-white cursor-not-allowed"
                            : vpnState.isConnected
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-violet-600 hover:bg-violet-700 text-white"
                        }`}
                      >
                        {isLoading ? (
                          <motion.div
                            className="flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <motion.div
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="ml-2">Connecting...</span>
                          </motion.div>
                        ) : (
                          <motion.span
                            key={vpnState.isConnected ? "disconnect" : "connect"}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                          >
                            {vpnState.isConnected ? "Disconnect" : "Connect"}
                          </motion.span>
                        )}
                      </button>

                      <button
                        onClick={() => setShowServerList(true)}
                        className="w-full py-2 px-4 rounded-lg font-medium border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors flex items-center justify-center"
                      >
                        <FiSettings className="w-4 h-4 mr-2" />
                        Configure VPN
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
