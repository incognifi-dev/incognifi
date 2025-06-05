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

export function VPNDropdown({ isOpen, onClose }: VPNDropdownProps) {
  // Use VPN store instead of local state
  const { vpnState, setCurrentServer, setConnectionStatus } = useVPNStore();

  const [isLoading, setIsLoading] = React.useState(false);
  const [showServerList, setShowServerList] = React.useState(false);
  const [hasAutoOpened, setHasAutoOpened] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Live latency monitoring state
  const [currentLatency, setCurrentLatency] = React.useState<number | null>(null);
  const [isCheckingLatency, setIsCheckingLatency] = React.useState(false);

  // Use useRef instead of useState for interval to avoid cleanup issues
  const latencyIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Memoize the latency checking function to prevent recreation on every render
  const checkCurrentServerLatency = React.useCallback(async () => {
    // Early return if dropdown is not open - no logic should run
    if (!isOpen) {
      return;
    }

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
        // Use the current measurement directly - no need for averaging
        setCurrentLatency(totalTime);
      } else {
        setCurrentLatency(999);
      }
    } catch (error) {
      setCurrentLatency(999);
    } finally {
      setIsCheckingLatency(false);
    }
  }, [isOpen, vpnState.isConnected, vpnState.currentServer.type]);

  // Start/stop live latency monitoring with proper cleanup
  React.useEffect(() => {
    // Clear any existing interval first
    if (latencyIntervalRef.current) {
      clearInterval(latencyIntervalRef.current);
      latencyIntervalRef.current = null;
    }

    // Reset states when dropdown closes
    if (!isOpen) {
      setCurrentLatency(null);
      setIsCheckingLatency(false);
      return;
    }

    // Only run latency monitoring when dropdown is open AND connected
    if (vpnState.isConnected && vpnState.currentServer.type === "oxylabs-residential") {
      // Reset latency when dropdown opens
      setCurrentLatency(null);

      // Initial check immediately
      checkCurrentServerLatency();

      // Set up periodic checking every 30 seconds (reduced frequency to save CPU)
      latencyIntervalRef.current = setInterval(checkCurrentServerLatency, 30000);
    } else {
      // Clear latency when disconnected
      setCurrentLatency(null);
    }

    // Cleanup function
    return () => {
      if (latencyIntervalRef.current) {
        clearInterval(latencyIntervalRef.current);
        latencyIntervalRef.current = null;
      }
    };
  }, [isOpen, vpnState.isConnected, vpnState.currentServer.type, checkCurrentServerLatency]);

  // Auto-open server list when dropdown first opens
  React.useEffect(() => {
    // Only run this logic when dropdown is open
    if (!isOpen) {
      return;
    }

    if (!hasAutoOpened) {
      setShowServerList(true);
      setHasAutoOpened(true);
    }
  }, [isOpen, hasAutoOpened]);

  // Clear all states when dropdown closes
  React.useEffect(() => {
    if (!isOpen) {
      // Reset all interactive states when closing
      setCurrentLatency(null);
      setIsCheckingLatency(false);
      setMessage(null);
      setIsLoading(false);

      // Clear any pending message timeouts
      // Note: Individual timeouts from setTimeout should be tracked with refs if we need to clear them
    }
  }, [isOpen]);

  const toggleConnection = async () => {
    if (vpnState.isConnected) {
      // Disconnect - disable proxy
      setIsLoading(true);

      try {
        const result = await ipcRenderer.invoke("disable-proxy");

        if (result.success) {
          setMessage({ type: "success", text: "Proxy disconnected" });
          setTimeout(() => setMessage(null), 3000);

          // Refresh the current tab to use direct connection
          await ipcRenderer.invoke("refresh-current-tab");
        } else {
          setMessage({ type: "error", text: result.message || "Failed to disable proxy" });
        }

        // Always disconnect VPN state even if proxy disable fails
        setConnectionStatus(false);
      } catch (error) {
        setMessage({ type: "error", text: "Failed to disable proxy" });
        setConnectionStatus(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Connect - but we need a server selected first
      if (!vpnState.currentServer.id) {
        setMessage({ type: "error", text: "Please select a server first" });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      setIsLoading(true);

      try {
        // Use the currently selected server
        const serverConfig = {
          endpoint: vpnState.currentServer.ip,
          port: vpnState.currentServer.port,
          countryCode: vpnState.currentServer.countryCode,
        };

        const result = await ipcRenderer.invoke("set-proxy-server", serverConfig);

        if (result.success) {
          setMessage({ type: "success", text: "Proxy connected" });
          setTimeout(() => setMessage(null), 3000);

          // Refresh the current tab to use proxy connection
          await ipcRenderer.invoke("refresh-current-tab");

          setConnectionStatus(true);
        } else {
          setMessage({ type: "error", text: result.message || "Failed to enable proxy" });
        }
      } catch (error) {
        setMessage({ type: "error", text: "Failed to enable proxy" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleServerSelect = async (server: any) => {
    setShowServerList(false);
    setIsLoading(true);

    try {
      // Create server config for the main process
      const serverConfig = {
        endpoint: server.ip,
        port: server.port,
        countryCode: server.countryCode,
      };

      // Set the proxy server
      const result = await ipcRenderer.invoke("set-proxy-server", serverConfig);

      if (result.success) {
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

        setMessage({
          type: "success",
          text: `Successfully switched to ${server.country}`,
        });
        setTimeout(() => setMessage(null), 3000);

        // Refresh the current tab to use the new proxy
        await ipcRenderer.invoke("refresh-current-tab");
      } else {
        setMessage({ type: "error", text: result.message || "Failed to configure proxy" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to configure proxy" });
    } finally {
      setIsLoading(false);
    }
  };

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
                  {/* Simplified activity indicator - only animate when checking latency */}
                  <FiActivity className={`w-5 h-5 ${vpnState.isConnected ? "text-green-400" : "text-red-400"}`} />
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
                              // Static dot instead of infinitely animating one
                              <div
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
                      </div>
                    )}

                    {/* Message Display */}
                    <AnimatePresence>
                      {message && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`mb-4 p-3 rounded-lg ${
                            message.type === "success"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          <div className="flex items-center">
                            {message.type === "success" ? (
                              <FiCheck className="w-4 h-4 mr-2" />
                            ) : (
                              <FiX className="w-4 h-4 mr-2" />
                            )}
                            {message.text}
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
