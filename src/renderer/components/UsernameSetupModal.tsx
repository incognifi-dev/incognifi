import React, { useState } from "react";
import { FiX } from "react-icons/fi";

interface UsernameSetupModalProps {
  onComplete: (username: string) => void;
  onClose: () => void;
}

export function UsernameSetupModal({ onComplete, onClose }: UsernameSetupModalProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate username
    if (username.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }
    if (username.length > 15) {
      setError("Username must be less than 15 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    onComplete(username);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-enter">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 relative animate-pop-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold text-white mb-1">Chat Feature Demo</h2>
        <p className="text-gray-400 mb-2">Coming Soon - Try our chat demo!</p>
        <div className="bg-violet-600/20 border border-violet-500/30 rounded-lg p-3 mb-6">
          <p className="text-violet-300 text-sm">
            🚀 This is a preview of our upcoming social features. The chat system shown here is a demonstration of how
            it will work when fully released.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              placeholder="Enter your username"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover-scale"
              disabled={!username.trim()}
            >
              Get Started
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
