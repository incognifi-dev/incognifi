import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiActivity, FiRefreshCw, FiX } from "react-icons/fi";
import { ServerList } from "./ServerList";

interface VPNDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Server {
  id: string;
  country: string;
  city: string;
  ip: string;
  ping: number;
  load: number;
}

// Dummy data for now
const INITIAL_SERVER = {
  id: "nl1",
  country: "Netherlands",
  city: "Amsterdam",
  ip: "185.93.1.96",
  ping: 28,
  load: 65,
};

const DUMMY_VPN_STATE = {
  isConnected: true,
  signalStrength: 85,
  currentServer: INITIAL_SERVER,
};

export function VPNDropdown({ isOpen, onClose }: VPNDropdownProps) {
  const [vpnState, setVpnState] = React.useState(DUMMY_VPN_STATE);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showServerList, setShowServerList] = React.useState(false);

  const toggleConnection = async () => {
    if (vpnState.isConnected) {
      // Immediate disconnect
      setVpnState((prev) => ({ ...prev, isConnected: false }));
    } else {
      // Show loading state
      setIsLoading(true);
      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsLoading(false);
      setVpnState((prev) => ({ ...prev, isConnected: true }));
    }
  };

  const handleServerSelect = async (server: Server) => {
    setShowServerList(false);
    if (server.id !== vpnState.currentServer.id) {
      setIsLoading(true);
      // Simulate server switch delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setVpnState((prev) => ({
        ...prev,
        currentServer: server,
        isConnected: true,
      }));
      setIsLoading(false);
    }
  };

  const getSignalColor = (strength: number) => {
    if (strength >= 70) return "rgb(34 197 94)"; // green-500
    if (strength >= 40) return "rgb(234 179 8)"; // yellow-500
    return "rgb(239 68 68)"; // red-500
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
              width: showServerList ? 480 : 320,
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
                <h3 className="text-white font-medium">VPN Connection</h3>
                <motion.div
                  animate={{
                    scale: vpnState.isConnected ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <FiActivity className={`w-5 h-5 ${vpnState.isConnected ? "text-green-400" : "text-red-400"}`} />
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
                    <h4 className="font-medium text-gray-700">Select Server</h4>
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

                  {/* Signal Strength */}
                  {vpnState.isConnected && (
                    <div className="space-y-4 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Signal Strength</span>
                        <div className="flex items-center">
                          <div className="relative mr-3">
                            <motion.div
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
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
                                backgroundColor: getSignalColor(vpnState.signalStrength),
                              }}
                            />
                          </div>
                          <span className="font-medium text-violet-600">{vpnState.signalStrength}%</span>
                        </div>
                      </div>

                      {/* Server Info */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Server</span>
                        <span className="font-medium text-gray-800">
                          {vpnState.currentServer.city}, {vpnState.currentServer.country}
                        </span>
                      </div>

                      {/* IP Address */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">IP Address</span>
                        <span className="font-medium text-gray-800">{vpnState.currentServer.ip}</span>
                      </div>
                    </div>
                  )}

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

                    {vpnState.isConnected && (
                      <button
                        onClick={() => setShowServerList(true)}
                        className="w-full py-2 px-4 rounded-lg font-medium border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors flex items-center justify-center"
                      >
                        <FiRefreshCw className="w-4 h-4 mr-2" />
                        Switch Server
                      </button>
                    )}
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
