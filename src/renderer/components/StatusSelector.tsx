import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown } from "react-icons/fi";
import type { UserStatus } from "../types/social";

interface StatusSelectorProps {
  currentStatus: UserStatus;
  onStatusChange: (status: UserStatus) => void;
}

const statusOptions: { value: UserStatus; label: string; color: string }[] = [
  { value: "online", label: "Online", color: "bg-green-500" },
  { value: "away", label: "Away", color: "bg-yellow-500" },
  { value: "offline", label: "Offline", color: "bg-gray-500" },
];

export function StatusSelector({ currentStatus, onStatusChange }: StatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = statusOptions.find((opt) => opt.value === currentStatus);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors rounded-lg px-2 py-1 hover:bg-gray-800"
      >
        <div className={`w-2 h-2 rounded-full ${currentOption?.color}`} />
        <span className="text-sm">{currentOption?.label}</span>
        <FiChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute bottom-full mb-2 right-0 w-32 bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden z-50"
            >
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onStatusChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2 px-3 py-2 text-sm ${
                    currentStatus === option.value
                      ? "bg-violet-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  } transition-colors`}
                >
                  <div className={`w-2 h-2 rounded-full ${option.color}`} />
                  <span>{option.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
