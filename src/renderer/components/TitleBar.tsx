import React, { useState } from "react";
import { Tab } from "../types";
import { XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import logoWhite from "../assets/icognifi-white.png";
import { VPNDropdown } from "./VPNDropdown";

interface TitleBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }) => {
  const [isVPNDropdownOpen, setIsVPNDropdownOpen] = useState(false);

  // Detect if we're on macOS to show traffic lights spacer
  const isMac = typeof process !== "undefined" && process.platform === "darwin";

  return (
    <div className="flex items-center h-12 bg-gradient-to-r from-violet-600 to-indigo-600 px-2 draggable">
      {/* Spacer for macOS traffic lights - only show on macOS */}
      {isMac && <div className="w-16" />}

      {/* Brand */}
      <div className="relative ml-4 mt-1">
        <div
          className="flex items-center mr-4 cursor-pointer hover:opacity-80 transition-opacity non-draggable"
          onClick={() => setIsVPNDropdownOpen(!isVPNDropdownOpen)}
        >
          <img
            src={logoWhite}
            alt="IcogniFi"
            className="w-6 h-6 mr-2 object-contain"
          />
          <span className="text-white font-semibold text-sm">IcogniFi</span>
        </div>

        <VPNDropdown
          isOpen={isVPNDropdownOpen}
          onClose={() => setIsVPNDropdownOpen(false)}
        />
      </div>

      {/* Tabs */}
      <div className="flex-1 flex items-center space-x-1 overflow-x-auto non-draggable">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group relative flex items-center min-w-[200px] max-w-[200px] h-8 px-3 rounded-t-lg cursor-pointer transition-all duration-200 ${
              activeTabId === tab.id ? "bg-white" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            onClick={() => onTabClick(tab.id)}
          >
            {tab.favicon && (
              <img
                src={tab.favicon}
                alt=""
                className="w-4 h-4 mr-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <span className={`flex-1 truncate text-sm ${activeTabId === tab.id ? "text-gray-800" : "text-white"}`}>
              {tab.title || tab.url}
            </span>
            {tab.isLoading ? (
              <div
                className={`w-4 h-4 ml-2 rounded-full border-2 border-t-transparent animate-spin ${
                  activeTabId === tab.id ? "border-violet-600" : "border-white/50"
                }`}
              />
            ) : (
              <button
                className="hidden group-hover:block ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <XMarkIcon
                  className={`w-4 h-4 ${
                    activeTabId === tab.id ? "text-gray-500 hover:text-gray-700" : "text-white/70 hover:text-white"
                  }`}
                />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* New Tab Button */}
      <button
        className="flex items-center justify-center w-8 h-8 ml-1 rounded-md text-white hover:bg-white/10 transition-colors non-draggable"
        onClick={onNewTab}
      >
        <PlusIcon className="w-5 h-5" />
      </button>
    </div>
  );
};
