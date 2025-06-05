import { useEffect, useState } from "react";
import { FiCheck, FiEye, FiEyeOff, FiRefreshCw, FiSettings, FiWifi, FiWifiOff, FiX } from "react-icons/fi";
import { ProxyConfig as ProxyConfigType } from "../types";

// Since contextIsolation is false, we can access electron directly
const { ipcRenderer } = window.require("electron");

interface ProxyConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProxyConfig({ isOpen, onClose }: ProxyConfigProps) {
  const [config, setConfig] = useState<ProxyConfigType>({
    enabled: false,
    host: "127.0.0.1",
    port: 1080,
    type: "socks5",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  // Load current proxy configuration
  useEffect(() => {
    if (isOpen) {
      loadProxyConfig();
    }
  }, [isOpen]);

  // Handle message display animations
  useEffect(() => {
    if (message) {
      setShowMessage(true);
      const timer = setTimeout(() => {
        setShowMessage(false);
        setTimeout(() => setMessage(null), 300); // Wait for fade out animation
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadProxyConfig = async () => {
    try {
      const currentConfig = await ipcRenderer.invoke("get-proxy-config");
      setConfig(currentConfig);
    } catch (error) {
      console.error("Failed to load proxy config:", error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await ipcRenderer.invoke("set-proxy-config", config);

      if (result.success) {
        setMessage({ type: "success", text: result.message });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save proxy configuration" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    setIsLoading(true);

    try {
      // First save the current config to ensure any UI changes are persisted
      await ipcRenderer.invoke("set-proxy-config", config);

      // Then toggle the proxy state
      const result = await ipcRenderer.invoke("toggle-proxy");
      setConfig((prev) => ({ ...prev, enabled: result.enabled }));

      if (result.success) {
        setMessage({ type: "success", text: result.message });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to toggle proxy" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setMessage(null);

    try {
      const result = await ipcRenderer.invoke("test-proxy-connection");

      if (result.success) {
        setMessage({ type: "success", text: "Proxy connection test successful!" });
      } else {
        setMessage({ type: "error", text: "Proxy connection test failed" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to test proxy connection" });
    } finally {
      setIsTesting(false);
    }
  };

  const updateConfig = (updates: Partial<ProxyConfigType>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-[200] backdrop-enter"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 bg-white rounded-xl shadow-xl z-[201] animate-pop-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiSettings className="w-5 h-5 text-white mr-2" />
              <h3 className="text-white font-medium">Custom Proxy Configuration</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              {config.enabled ? (
                <FiWifi className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <FiWifiOff className="w-5 h-5 text-gray-400 mr-2" />
              )}
              <span className="font-medium">Proxy {config.enabled ? "Enabled" : "Disabled"}</span>
            </div>
            <button
              onClick={handleToggle}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors hover-scale ${
                config.enabled ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"
              } disabled:opacity-50`}
            >
              {isLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : config.enabled ? "Disable" : "Enable"}
            </button>
          </div>

          {/* Proxy Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Proxy Type</label>
            <select
              value={config.type}
              onChange={(e) => updateConfig({ type: e.target.value as "socks5" | "socks4" | "http" })}
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
                value={config.host}
                onChange={(e) => updateConfig({ host: e.target.value })}
                placeholder="127.0.0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => updateConfig({ port: parseInt(e.target.value) || 1080 })}
                placeholder="1080"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Authentication (Optional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Username (Optional)</label>
            <input
              type="text"
              value={config.username || ""}
              onChange={(e) => updateConfig({ username: e.target.value })}
              placeholder="Enter username"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Password (Optional)</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={config.password || ""}
                onChange={(e) => updateConfig({ password: e.target.value })}
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
          {message && (
            <div
              className={`mb-4 p-3 rounded-lg transition-all ${
                showMessage ? "animate-slide-down" : "animate-fade-out"
              } ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              <div className="flex items-center">
                {message.type === "success" ? <FiCheck className="w-4 h-4 mr-2" /> : <FiX className="w-4 h-4 mr-2" />}
                {message.text}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center hover-scale"
            >
              {isLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : "Save Configuration"}
            </button>
            <button
              onClick={handleTest}
              disabled={isTesting || isLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center hover-scale"
            >
              {isTesting ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : "Test"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
