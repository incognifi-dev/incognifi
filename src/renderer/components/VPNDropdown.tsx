import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import {
  FiActivity,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiSettings,
  FiWifi,
  FiWifiOff,
  FiX,
  FiInfo,
  FiClock,
  FiShield,
  FiMapPin,
} from "react-icons/fi";
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
  const [showProxyConfig, setShowProxyConfig] = React.useState(false);
  const [hasAutoOpened, setHasAutoOpened] = React.useState(false);

  // Proxy configuration state
  const [proxyConfig, setProxyConfig] = React.useState<ProxyConfigType>({
    enabled: false,
    host: "pr.oxylabs.io",
    port: 7777,
    type: "http",
  });
  const [isProxyLoading, setIsProxyLoading] = React.useState(false);
  const [proxyMessage, setProxyMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);

  // Live latency monitoring state
  const [currentLatency, setCurrentLatency] = React.useState<number | null>(null);
  const [latencyMeasurements, setLatencyMeasurements] = React.useState<number[]>([]);
  const [isCheckingLatency, setIsCheckingLatency] = React.useState(false);
  const [latencyInterval, setLatencyInterval] = React.useState<NodeJS.Timeout | null>(null);

  // Load proxy configuration when dropdown opens
  React.useEffect(() => {
    if (isOpen && showProxyConfig) {
      loadProxyConfig();
    }
  }, [isOpen, showProxyConfig]);

  // Auto-open server list when dropdown first opens
  React.useEffect(() => {
    if (isOpen && !hasAutoOpened) {
      setShowServerList(true);
      setHasAutoOpened(true);
    }
  }, [isOpen, hasAutoOpened]);

  const loadProxyConfig = async () => {
    try {
      const currentConfig = await ipcRenderer.invoke("get-proxy-config");
      setProxyConfig(currentConfig);
    } catch (error) {
      console.error("Failed to load proxy config:", error);
    }
  };

  const handleProxySave = async () => {
    setIsProxyLoading(true);
    setProxyMessage(null);

    try {
      const result = await ipcRenderer.invoke("set-proxy-config", proxyConfig);

      if (result.success) {
        setProxyMessage({ type: "success", text: result.message });
        setTimeout(() => setProxyMessage(null), 3000);

        // Refresh the current tab to use updated proxy settings
        await ipcRenderer.invoke("refresh-current-tab");
      } else {
        setProxyMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setProxyMessage({ type: "error", text: "Failed to save proxy configuration" });
    } finally {
      setIsProxyLoading(false);
    }
  };

  const handleProxyToggle = async () => {
    setIsProxyLoading(true);

    try {
      await ipcRenderer.invoke("set-proxy-config", proxyConfig);
      const result = await ipcRenderer.invoke("toggle-proxy");
      setProxyConfig((prev) => ({ ...prev, enabled: result.enabled }));

      if (result.success) {
        setProxyMessage({ type: "success", text: result.message });
        setTimeout(() => setProxyMessage(null), 3000);

        // Refresh the current tab to use new proxy state
        await ipcRenderer.invoke("refresh-current-tab");
      } else {
        setProxyMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setProxyMessage({ type: "error", text: "Failed to toggle proxy" });
    } finally {
      setIsProxyLoading(false);
    }
  };

  const handleProxyTest = async () => {
    setIsTesting(true);
    setProxyMessage(null);

    try {
      const result = await ipcRenderer.invoke("test-proxy-connection");

      if (result.success) {
        setProxyMessage({ type: "success", text: "Proxy connection test successful!" });
      } else {
        setProxyMessage({ type: "error", text: "Proxy connection test failed" });
      }
    } catch (error) {
      setProxyMessage({ type: "error", text: "Failed to test proxy connection" });
    } finally {
      setIsTesting(false);
      setTimeout(() => setProxyMessage(null), 3000);
    }
  };

  const updateProxyConfig = (updates: Partial<ProxyConfigType>) => {
    setProxyConfig((prev) => ({ ...prev, ...updates }));
  };

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
          setProxyMessage({ type: "success", text: "Oxylabs proxy disconnected" });
          setTimeout(() => setProxyMessage(null), 3000);

          // Refresh the current tab to use direct connection
          await ipcRenderer.invoke("refresh-current-tab");
        }

        // Immediate disconnect
        setConnectionStatus(false);
      } catch (error) {
        console.error("Failed to disable proxy:", error);
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
          setProxyMessage({ type: "success", text: "Oxylabs proxy connected" });
          setTimeout(() => setProxyMessage(null), 3000);

          // Refresh the current tab to use proxy connection
          await ipcRenderer.invoke("refresh-current-tab");
        }

        // Simulate connection delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Connect VPN
        setConnectionStatus(true);
      } catch (error) {
        console.error("Failed to enable proxy:", error);
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

    // If it's an Oxylabs server configuration
    if (server.type === "oxylabs-residential" && server.oxylabsConfig) {
      setIsLoading(true);

      try {
        // First, save the Oxylabs configuration to actually update the proxy settings
        console.log(`🔄 [VPNDropdown] Saving Oxylabs config for server switch to ${server.country}`);
        const saveResult = await ipcRenderer.invoke("save-oxylabs-config", server.oxylabsConfig);

        if (!saveResult.success) {
          console.error(`❌ [VPNDropdown] Failed to save Oxylabs config:`, saveResult.message);
          setProxyMessage({ type: "error", text: `Failed to configure proxy: ${saveResult.message}` });
          return;
        }

        console.log(`✅ [VPNDropdown] Oxylabs config saved successfully for ${server.country}`);

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
        console.log(`🔄 [VPNDropdown] Refreshing current tab to use new proxy for ${server.country}`);
        await ipcRenderer.invoke("refresh-current-tab");

        // Simulate server switch delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Failed to configure Oxylabs proxy:", error);
        setProxyMessage({ type: "error", text: "Failed to configure Oxylabs proxy" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Live latency monitoring function for Oxylabs
  const checkCurrentServerLatency = async () => {
    if (!vpnState.isConnected || vpnState.currentServer.type !== "oxylabs-residential") {
      console.log(`⚠️ [checkCurrentServerLatency] Skipping latency check - not connected to Oxylabs`);
      setCurrentLatency(null);
      return;
    }

    setIsCheckingLatency(true);

    try {
      console.log(`🌐 [checkCurrentServerLatency] Testing Oxylabs latency...`);

      const startTime = Date.now();
      const testResult = await ipcRenderer.invoke("test-proxy-connection");
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      if (testResult.success) {
        // Add the new measurement to our array
        setLatencyMeasurements((prev) => {
          const newMeasurements = [...prev, totalTime];
          // Keep only the last 10 measurements
          const trimmedMeasurements = newMeasurements.slice(-10);

          // Calculate average of all measurements
          const average = Math.round(
            trimmedMeasurements.reduce((sum, val) => sum + val, 0) / trimmedMeasurements.length
          );

          console.log(`✅ [checkCurrentServerLatency] Oxylabs latency measurement:`, {
            newLatency: totalTime,
            measurementCount: trimmedMeasurements.length,
            average: average,
          });

          // Update the current latency with the average
          setCurrentLatency(average);

          return trimmedMeasurements;
        });
      } else {
        console.warn(`❌ [checkCurrentServerLatency] Oxylabs latency test failed:`, testResult.message);
        if (latencyMeasurements.length === 0) {
          setCurrentLatency(999);
        }
      }
    } catch (error) {
      console.error(`💥 [checkCurrentServerLatency] Error testing Oxylabs latency:`, error);
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
      console.log(`🔄 [VPNDropdown] Dropdown opened, resetting Oxylabs latency measurements`);
      setLatencyMeasurements([]);
      setCurrentLatency(null);

      // Initial check immediately
      checkCurrentServerLatency();

      // Set up periodic checking every 5 seconds
      const interval = setInterval(() => {
        checkCurrentServerLatency();
      }, 5000);

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
      console.log(`🔄 [VPNDropdown] Dropdown closed or disconnected, clearing latency data`);
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
    if (showProxyConfig) return 700;
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
            className="fixed mt-10 bg-white rounded-xl shadow-xl overflow-hidden z-[101]"
            style={{ top: "0", left: "1rem" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">
                  {showProxyConfig ? "Custom Proxy Configuration" : "Oxylabs VPN Connection"}
                </h3>
                <motion.div
                  animate={{
                    scale: vpnState.isConnected ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {showProxyConfig ? (
                    <FiSettings className="w-5 h-5 text-white" />
                  ) : (
                    <FiActivity className={`w-5 h-5 ${vpnState.isConnected ? "text-green-400" : "text-red-400"}`} />
                  )}
                </motion.div>
              </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              {showServerList ? (
                <motion.div
                  key="server-list"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                >
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium text-gray-700">Configure Oxylabs</h4>
                    <button
                      onClick={() => setShowServerList(false)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <FiX className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  <ServerList
                    onSelect={handleServerSelect}
                    currentServer={vpnState.currentServer}
                  />
                </motion.div>
              ) : showProxyConfig ? (
                <motion.div
                  key="proxy-config"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="h-[400px] overflow-y-auto"
                >
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium text-gray-700">Custom Proxy Settings</h4>
                    <button
                      onClick={() => setShowProxyConfig(false)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <FiX className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="p-4">
                    {/* Status Toggle */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        {proxyConfig.enabled ? (
                          <FiWifi className="w-5 h-5 text-green-500 mr-2" />
                        ) : (
                          <FiWifiOff className="w-5 h-5 text-gray-400 mr-2" />
                        )}
                        <span className="font-medium">Proxy {proxyConfig.enabled ? "Enabled" : "Disabled"}</span>
                      </div>
                      <button
                        onClick={handleProxyToggle}
                        disabled={isProxyLoading}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          proxyConfig.enabled
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        } disabled:opacity-50`}
                      >
                        {isProxyLoading ? (
                          <FiRefreshCw className="w-4 h-4 animate-spin" />
                        ) : proxyConfig.enabled ? (
                          "Disable"
                        ) : (
                          "Enable"
                        )}
                      </button>
                    </div>

                    {/* Proxy Type */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Proxy Type</label>
                      <select
                        value={proxyConfig.type}
                        onChange={(e) => updateProxyConfig({ type: e.target.value as "socks5" | "socks4" | "http" })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="socks5">SOCKS5</option>
                        <option value="socks4">SOCKS4</option>
                        <option value="http">HTTP</option>
                      </select>
                    </div>

                    {/* Host and Port */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Host</label>
                        <input
                          type="text"
                          value={proxyConfig.host}
                          onChange={(e) => updateProxyConfig({ host: e.target.value })}
                          placeholder="pr.oxylabs.io"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                        <input
                          type="number"
                          value={proxyConfig.port}
                          onChange={(e) => updateProxyConfig({ port: parseInt(e.target.value) || 7777 })}
                          placeholder="7777"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Authentication (Optional) */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Username (Optional)</label>
                      <input
                        type="text"
                        value={proxyConfig.username || ""}
                        onChange={(e) => updateProxyConfig({ username: e.target.value })}
                        placeholder="Enter username"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password (Optional)</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={proxyConfig.password || ""}
                          onChange={(e) => updateProxyConfig({ password: e.target.value })}
                          placeholder="Enter password"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Message */}
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

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleProxySave}
                        disabled={isProxyLoading}
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        {isProxyLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : "Save"}
                      </button>
                      <button
                        onClick={handleProxyTest}
                        disabled={isTesting || isProxyLoading}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        {isTesting ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : "Test"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="main-content"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  className="p-4"
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
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Proxy Endpoint</span>
                        <span className="font-medium text-gray-800">
                          {vpnState.currentServer.ip}:{vpnState.currentServer.port}
                        </span>
                      </div>
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
                            Oxylabs provides access to millions of residential IP addresses worldwide with high success
                            rates and automatic rotation.
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
                      Configure Oxylabs
                    </button>

                    {/* Custom Proxy Configuration Button */}
                    <button
                      onClick={() => setShowProxyConfig(true)}
                      className="w-full py-2 px-4 rounded-lg font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                      <FiSettings className="w-4 h-4 mr-2" />
                      Advanced Proxy Settings
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
