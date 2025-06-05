import React, { useState, useEffect } from "react";
import { FiClock, FiDownload, FiUpload, FiWifi, FiWifiOff } from "react-icons/fi";

// Since contextIsolation is false, we can access electron directly
const { ipcRenderer } = window.require("electron");

interface NetworkStats {
  downloadSpeed: number;
  uploadSpeed: number;
  totalDownload: number;
  totalUpload: number;
  sessionDuration: number;
  isConnected: boolean;
}

interface NetworkStatsProps {
  className?: string;
}

export function NetworkStats({ className = "" }: NetworkStatsProps) {
  const [stats, setStats] = useState<NetworkStats>({
    downloadSpeed: 0,
    uploadSpeed: 0,
    totalDownload: 0,
    totalUpload: 0,
    sessionDuration: 0,
    isConnected: false,
  });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    // Function to get network stats from main process
    const getNetworkStats = async () => {
      try {
        const networkData = await ipcRenderer.invoke("get-network-stats");
        setStats(networkData);
      } catch (error) {
        setStats((prev) => ({ ...prev, isConnected: false }));
      }
    };

    // Visibility change handler
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start monitoring only if visible
    if (isVisible) {
      getNetworkStats();
      intervalId = setInterval(getNetworkStats, 10000); // Update every 10 seconds (reduced frequency for better performance)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isVisible]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
  };

  return (
    <div className={`flex items-center space-x-4 text-xs ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center space-x-1">
        {stats.isConnected ? (
          <FiWifi className="w-3 h-3 text-green-400" />
        ) : (
          <FiWifiOff className="w-3 h-3 text-red-400" />
        )}
      </div>

      {/* Session Duration */}
      <div className="flex items-center space-x-1">
        <FiClock className="w-3 h-3 text-gray-400" />
        <span className="text-gray-300 min-w-[50px]">{formatDuration(stats.sessionDuration)}</span>
      </div>

      {/* Upload/Download Speed - Stacked Vertically */}
      <div className="flex flex-col items-start space-y-0">
        <div className="flex items-center space-x-1">
          <FiDownload className="w-3 h-3 text-blue-400" />
          <span className="text-gray-300 min-w-[60px] text-right">{formatSpeed(stats.downloadSpeed)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <FiUpload className="w-3 h-3 text-green-400" />
          <span className="text-gray-300 min-w-[60px] text-right">{formatSpeed(stats.uploadSpeed)}</span>
        </div>
      </div>

      {/* Session Totals - Stacked Vertically (hidden on smaller screens) */}
      <div className="hidden md:flex flex-col items-start space-y-0 text-gray-400 border-l border-gray-700 pl-3">
        <span
          className="text-xs"
          title="Total downloaded this session"
        >
          ↓ {formatBytes(stats.totalDownload)}
        </span>
        <span
          className="text-xs"
          title="Total uploaded this session"
        >
          ↑ {formatBytes(stats.totalUpload)}
        </span>
      </div>
    </div>
  );
}
