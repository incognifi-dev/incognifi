import React, { useEffect, useRef } from "react";
import { TrashIcon, ClockIcon } from "@heroicons/react/24/outline";

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHistory: () => void;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ isOpen, onClose, onOpenHistory }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleClearStorage = async () => {
    try {
      if (typeof window !== "undefined" && window.require) {
        const { ipcRenderer } = window.require("electron");
        const result = await ipcRenderer.invoke("clear-storage");
        if (result.success) {
          console.log("Storage cleared successfully");
        }
      }
    } catch (error) {
      console.error("Failed to clear storage:", error);
    }
    onClose();
  };

  const handleHistoryClick = () => {
    onOpenHistory();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
    >
      <div className="py-2">
        <div className="px-4 py-2 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">Settings</h3>
        </div>

        <button
          onClick={handleHistoryClick}
          className="w-full flex items-center px-4 py-3 text-left hover:bg-violet-50 transition-colors group"
        >
          <ClockIcon className="w-4 h-4 mr-3 text-violet-500 group-hover:text-violet-600" />
          <div>
            <div className="text-sm font-medium text-gray-900 group-hover:text-violet-600">View History</div>
            <div className="text-xs text-gray-500 group-hover:text-violet-500">Browse your navigation history</div>
          </div>
        </button>

        <button
          onClick={handleClearStorage}
          className="w-full flex items-center px-4 py-3 text-left hover:bg-red-50 transition-colors group"
        >
          <TrashIcon className="w-4 h-4 mr-3 text-red-500 group-hover:text-red-600" />
          <div>
            <div className="text-sm font-medium text-gray-900 group-hover:text-red-600">Clear Storage & Reset</div>
            <div className="text-xs text-gray-500 group-hover:text-red-500">Remove all bookmarks and reset browser</div>
          </div>
        </button>
      </div>
    </div>
  );
};
