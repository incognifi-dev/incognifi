import { FiArrowLeft, FiArrowRight, FiRefreshCw, FiHome, FiLock, FiSearch, FiStar } from "react-icons/fi";
import type { WebviewTag } from "electron";
import { useState, useEffect } from "react";

interface NavigationBarProps {
  displayUrl: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  bookmarks: Array<{ url: string }>;
  inputRef: React.RefObject<HTMLInputElement>;
  webviewRef: React.RefObject<WebviewTag>;
  onAddBookmark: () => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
}

export function NavigationBar({
  displayUrl,
  isLoading,
  canGoBack,
  canGoForward,
  bookmarks,
  inputRef,
  webviewRef,
  onAddBookmark,
  onInputFocus,
  onInputBlur,
}: NavigationBarProps) {
  const [inputValue, setInputValue] = useState(displayUrl);

  // Sync input value with displayUrl when it changes externally
  useEffect(() => {
    setInputValue(displayUrl);
  }, [displayUrl]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const webview = webviewRef.current;
    if (webview) {
      let urlToLoad = inputValue;
      if (!urlToLoad.startsWith("http://") && !urlToLoad.startsWith("https://")) {
        urlToLoad = `https://${urlToLoad}`;
      }
      webview.loadURL(urlToLoad);
      inputRef.current?.blur();
    }
  };

  const handleRefresh = () => {
    webviewRef.current?.reload();
  };

  const goBack = () => {
    webviewRef.current?.goBack();
  };

  const goForward = () => {
    webviewRef.current?.goForward();
  };

  const goHome = () => {
    const homeUrl = "https://www.google.com";
    webviewRef.current?.loadURL(homeUrl);
  };

  return (
    <div className="px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className={`p-1.5 rounded-full hover:bg-violet-50 transition-colors ${
              !canGoBack ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <FiArrowLeft className="w-4 h-4 text-violet-600" />
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            className={`p-1.5 rounded-full hover:bg-violet-50 transition-colors ${
              !canGoForward ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <FiArrowRight className="w-4 h-4 text-violet-600" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-full hover:bg-violet-50 transition-colors"
          >
            {isLoading ? (
              <FiRefreshCw className="w-4 h-4 text-violet-600 animate-spin" />
            ) : (
              <FiRefreshCw className="w-4 h-4 text-violet-600" />
            )}
          </button>
          <button
            onClick={goHome}
            className="p-1.5 rounded-full hover:bg-violet-50 transition-colors"
          >
            <FiHome className="w-4 h-4 text-violet-600" />
          </button>
        </div>

        <form
          onSubmit={handleUrlSubmit}
          className="flex-1 flex items-center"
        >
          <div className="flex items-center flex-1 px-3 py-1.5 bg-gray-50 rounded-lg ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-violet-500 transition-shadow">
            <FiLock className="w-4 h-4 text-gray-400 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="Search or enter address"
            />
            <button
              type="button"
              onClick={onAddBookmark}
              className="p-1 hover:bg-violet-50 rounded-full transition-colors"
              title="Bookmark this page"
            >
              <FiStar
                className={`w-4 h-4 ${
                  bookmarks.some((b) => b.url === displayUrl)
                    ? "text-violet-600 fill-current"
                    : "text-gray-400 hover:text-violet-600"
                }`}
              />
            </button>
            <FiSearch className="w-4 h-4 text-gray-400 ml-2" />
          </div>
        </form>
      </div>
    </div>
  );
}
