import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { FiCheck, FiEye, FiEyeOff, FiMapPin, FiShield, FiSettings, FiRefreshCw, FiGlobe } from "react-icons/fi";

// Since contextIsolation is false, we can access electron directly
const { ipcRenderer } = window.require("electron");

interface OxylabsConfig {
  customerId: string;
  password: string;
  countryCode: string;
  sessionId?: string;
}

interface ServerListProps {
  onSelect: (server: any) => void;
  currentServer?: any;
}

// Common country codes for easy selection
const COMMON_COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
];

export function ServerList({ onSelect }: ServerListProps) {
  const [oxylabsConfig, setOxylabsConfig] = useState<OxylabsConfig>({
    customerId: "icognifi_DNMju",
    password: "JFhIuaaMgMJkdJ1SHaXpIaZsK7_",
    countryCode: "US",
    sessionId: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Load saved proxy configuration
  useEffect(() => {
    loadProxyConfig();
  }, []);

  const loadProxyConfig = async () => {
    try {
      const config = await ipcRenderer.invoke("get-oxylabs-config");
      if (config) {
        setOxylabsConfig(config);
      }
    } catch (error) {
      console.error("Failed to load proxy config:", error);
    }
  };

  const saveProxyConfig = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await ipcRenderer.invoke("save-oxylabs-config", oxylabsConfig);

      if (result.success) {
        setMessage({ type: "success", text: result.message || "Proxy configuration saved successfully" });

        // Refresh the current tab to use the new proxy immediately
        await ipcRenderer.invoke("refresh-current-tab");

        // Create a server object for the parent component
        const residentialServer = {
          id: "oxylabs-residential",
          country: COMMON_COUNTRIES.find((c) => c.code === oxylabsConfig.countryCode)?.name || "Unknown",
          countryCode: oxylabsConfig.countryCode,
          city: "Residential Pool",
          ip: "pr.oxylabs.io",
          port: 7777,
          ping: null,
          isHealthy: true,
          lastChecked: Date.now(),
          type: "oxylabs-residential",
          oxylabsConfig,
        };

        onSelect(residentialServer);
      } else {
        setMessage({ type: "error", text: result.message || "Failed to save configuration" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save proxy configuration" });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 3000); // Back to normal timeout
    }
  };

  const testProxyConnection = async () => {
    setIsTestingConnection(true);
    setMessage(null);

    try {
      const result = await ipcRenderer.invoke("test-oxylabs-connection", oxylabsConfig);

      if (result.success) {
        setMessage({
          type: "success",
          text: `Connection successful! IP: ${result.ip || "Unknown"} | Location: ${result.location || "Unknown"}`,
        });
      } else {
        setMessage({ type: "error", text: result.message || "Connection test failed" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to test connection" });
    } finally {
      setIsTestingConnection(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const updateConfig = (updates: Partial<OxylabsConfig>) => {
    setOxylabsConfig((prev) => ({ ...prev, ...updates }));
  };

  // Quick server selection function
  const handleQuickServerSelect = async (countryCode: string) => {
    const country = COMMON_COUNTRIES.find((c) => c.code === countryCode);
    if (!country) return;

    setIsLoading(true);
    setMessage(null);

    try {
      // Load current saved config first
      const currentConfig = await ipcRenderer.invoke("get-oxylabs-config");

      if (!currentConfig || !currentConfig.customerId || !currentConfig.password) {
        setMessage({
          type: "error",
          text: "Please configure your proxy credentials first using the form below",
        });
        return;
      }

      // Create new config with selected country
      const newConfig = {
        ...currentConfig,
        countryCode: countryCode,
      };

      // Save the new configuration
      const result = await ipcRenderer.invoke("save-oxylabs-config", newConfig);

      if (result.success) {
        // Update local state
        setOxylabsConfig(newConfig);

        setMessage({
          type: "success",
          text: `Successfully switched to ${country.name}`,
        });

        // Create server object and notify parent
        const residentialServer = {
          id: "oxylabs-residential",
          country: country.name,
          countryCode: countryCode,
          city: "Residential Pool",
          ip: "pr.oxylabs.io",
          port: 7777,
          ping: null,
          isHealthy: true,
          lastChecked: Date.now(),
          type: "oxylabs-residential",
          oxylabsConfig: newConfig,
        };

        onSelect(residentialServer);
      } else {
        setMessage({ type: "error", text: result.message || "Failed to switch server" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to switch server" });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200"
        >
          <div className="flex items-center justify-center mb-2">
            <FiShield className="w-6 h-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-bold text-indigo-800">Residential Proxies</h2>
          </div>
          <p className="text-sm text-indigo-600">
            Premium residential proxy network with global coverage and high success rates
          </p>
        </motion.div>
      </div>

      {/* Quick Server Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
      >
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <FiGlobe className="w-5 h-5 mr-2" />
          Quick Country Selection
        </h3>
        <p className="text-sm text-gray-600 mb-4">Click on a country to quickly switch your proxy location:</p>

        <div className="grid grid-cols-2 gap-3">
          {COMMON_COUNTRIES.map((country) => (
            <motion.button
              key={country.code}
              onClick={() => handleQuickServerSelect(country.code)}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center p-3 rounded-lg border transition-all ${
                oxylabsConfig.countryCode === country.code
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-2xl mr-3">{country.flag}</span>
              <div className="text-left">
                <div className="font-medium">{country.name}</div>
                <div className="text-xs text-gray-500">{country.code}</div>
              </div>
              {oxylabsConfig.countryCode === country.code && <FiCheck className="w-5 h-5 text-indigo-600 ml-auto" />}
            </motion.button>
          ))}
        </div>

        {/* Message Display */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-4 p-3 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              <div className="flex items-center">
                {message.type === "success" ? (
                  <FiCheck className="w-4 h-4 mr-2" />
                ) : (
                  <FiShield className="w-4 h-4 mr-2" />
                )}
                {message.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Information Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
      >
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <FiMapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800 mb-1">Residential Proxy Network</h4>
              <p className="text-xs text-blue-700 leading-relaxed">
                Access to millions of real residential IPs from actual devices worldwide. High success rates and minimal
                blocking.
              </p>
            </div>
          </div>

          <div className="border-t border-blue-200 pt-3">
            <div className="flex items-start space-x-3">
              <FiShield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-1">How It Works</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Your traffic will be routed through the residential proxy network (pr.oxylabs.io:7777) using your
                  selected country targeting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
