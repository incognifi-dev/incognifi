// Hot reload test - this should trigger a refresh
import { useState, useRef, useEffect, createRef, useCallback } from "react";
import type { WebviewTag } from "electron";
import { NavigationBar } from "./components/NavigationBar";
import { BookmarksBar } from "./components/BookmarksBar";
import { TitleBar } from "./components/TitleBar";
import { SocialBar } from "./components/SocialBar";
import { HistoryPage } from "./components/HistoryPage";
import { ErrorPage } from "./components/ErrorPage";
import { Bookmark, Tab, HistoryEntry } from "./types";
import { defaultBookmarks } from "./data/defaultBookmarks";
import icognifiLogo from "./assets/icognifi-alpha.png";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheckIcon,
  UserGroupIcon,
  BookmarkIcon,
  GlobeAltIcon,
  LockClosedIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import { useVPNStore } from "./stores/vpnStore";
import { useServerStore } from "./stores/serverStore";

// Debounce utility function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>(() => [
    {
      id: "1",
      title: "New Tab",
      url: "https://www.google.com",
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      state: "splash",
    },
  ]);
  const [activeTabId, setActiveTabId] = useState("1");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const saved = localStorage.getItem("bookmarks");
    return saved ? JSON.parse(saved) : defaultBookmarks;
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem("browsing-history");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert date strings back to Date objects
      return parsed.map((entry: any) => ({
        ...entry,
        visitedAt: new Date(entry.visitedAt),
      }));
    }
    return [];
  });

  const webviewRefs = useRef<{ [key: string]: React.RefObject<WebviewTag> }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // VPN and server store integration
  const { vpnState } = useVPNStore();
  const { servers } = useServerStore();

  // Auto-switch state management with debouncing
  const [isAutoSwitching, setIsAutoSwitching] = useState(false);
  const [failedServerIds, setFailedServerIds] = useState<Set<string>>(new Set());

  const activeTab = tabs.find((tab) => tab.id === activeTabId)!;

  // Initialize ref for new tab
  if (!webviewRefs.current[activeTabId]) {
    webviewRefs.current[activeTabId] = createRef<WebviewTag>();
  }

  // Debounced storage functions
  const debouncedSaveBookmarks = useCallback(
    debounce((bookmarksToSave: Bookmark[]) => {
      localStorage.setItem("bookmarks", JSON.stringify(bookmarksToSave));
    }, 500),
    []
  );

  const debouncedSaveHistory = useCallback(
    debounce((historyToSave: HistoryEntry[]) => {
      localStorage.setItem("browsing-history", JSON.stringify(historyToSave));
    }, 1000),
    []
  );

  // Save bookmarks to localStorage with debouncing
  useEffect(() => {
    debouncedSaveBookmarks(bookmarks);
  }, [bookmarks, debouncedSaveBookmarks]);

  // Save history to localStorage with debouncing
  useEffect(() => {
    debouncedSaveHistory(history);
  }, [history, debouncedSaveHistory]);

  // Add IPC listener for refreshing current tab after server switch
  useEffect(() => {
    const { ipcRenderer } = window.require("electron");

    const handleRefreshCurrentTab = () => {
      const webview = webviewRefs.current[activeTabId]?.current;
      if (webview && activeTab?.state === "normal") {
        console.log("Refreshing current tab after server switch");
        webview.reload();
      }
    };

    ipcRenderer.on("refresh-current-tab", handleRefreshCurrentTab);

    return () => {
      ipcRenderer.removeListener("refresh-current-tab", handleRefreshCurrentTab);
    };
  }, [activeTabId, activeTab?.state]);

  // Request notification permissions for auto-switch notifications
  useEffect(() => {
    if (window.Notification && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  // Reset failed servers list when VPN disconnects
  useEffect(() => {
    if (!vpnState.isConnected) {
      setFailedServerIds(new Set());
      setIsAutoSwitching(false);
    }
  }, [vpnState.isConnected]);

  const addToHistory = (url: string, title: string, favicon?: string) => {
    // Don't add certain URLs to history
    if (url === "https://www.google.com" || url.startsWith("icognifi://") || url === "about:blank") {
      return;
    }

    setHistory((prev) => {
      const existing = prev.find((entry) => entry.url === url);
      if (existing) {
        // Update existing entry
        return prev.map((entry) =>
          entry.url === url
            ? {
                ...entry,
                title: title || entry.title,
                favicon: favicon || entry.favicon,
                visitedAt: new Date(),
                visitCount: entry.visitCount + 1,
              }
            : entry
        );
      } else {
        // Add new entry
        const newEntry: HistoryEntry = {
          id: Date.now().toString(),
          title: title || url,
          url,
          favicon,
          visitedAt: new Date(),
          visitCount: 1,
        };
        return [newEntry, ...prev].slice(0, 1000); // Keep only last 1000 entries
      }
    });
  };

  const removeHistoryEntry = (id: string) => {
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const openHistoryTab = () => {
    const historyTab: Tab = {
      id: Date.now().toString(),
      title: "History",
      url: "icognifi://history",
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      state: "history",
    };
    setTabs((prev) => [...prev, historyTab]);
    webviewRefs.current[historyTab.id] = createRef<WebviewTag>();
    setActiveTabId(historyTab.id);
  };

  const addBookmark = () => {
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      title: activeTab.title || activeTab.url,
      url: activeTab.url,
      favicon: activeTab.favicon,
    };

    // Check if bookmark already exists
    if (!bookmarks.some((b) => b.url === activeTab.url)) {
      setBookmarks((prev) => [...prev, newBookmark]);
    }
  };

  const removeBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const createTab = () => {
    const newTab: Tab = {
      id: Date.now().toString(),
      title: "New Tab",
      url: "https://www.google.com",
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      state: "splash",
    };
    setTabs((prev) => [...prev, newTab]);
    // Create ref before setting active tab
    webviewRefs.current[newTab.id] = createRef<WebviewTag>();
    // Set active tab after ensuring ref exists
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== tabId);
      if (newTabs.length === 0) {
        // Create a new tab with splash state if closing the last tab
        const newTab: Tab = {
          id: Date.now().toString(),
          title: "New Tab",
          url: "https://www.google.com",
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          state: "splash",
        };
        webviewRefs.current[newTab.id] = createRef<WebviewTag>();
        setActiveTabId(newTab.id);
        return [newTab];
      } else if (tabId === activeTabId) {
        // Find the next tab to focus
        const index = prev.findIndex((tab) => tab.id === tabId);
        const nextTab = prev[index + 1] || prev[index - 1];
        setActiveTabId(nextTab.id);
      }
      delete webviewRefs.current[tabId];
      return newTabs;
    });
  };

  const updateTab = (tabId: string, updates: Partial<Tab>) => {
    setTabs((prev) => prev.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab)));
  };

  useEffect(() => {
    const webview = webviewRefs.current[activeTabId]?.current;
    if (webview && activeTab?.state === "normal") {
      const handleStartLoading = () => {
        updateTab(activeTabId, { isLoading: true });
      };

      const handleStopLoading = () => {
        updateTab(activeTabId, { isLoading: false });
      };

      const handleNavigate = () => {
        const currentUrl = webview.getURL();
        const currentTitle = webview.getTitle();
        updateTab(activeTabId, {
          url: currentUrl,
          title: currentTitle || "New Tab",
          canGoBack: webview.canGoBack(),
          canGoForward: webview.canGoForward(),
          state: activeTab.state === "splash" ? "normal" : activeTab.state === "error" ? "normal" : activeTab.state,
          error: undefined,
        });

        // Add to history when navigation completes
        if (currentUrl && currentTitle) {
          addToHistory(currentUrl, currentTitle, activeTab.favicon);
        }
      };

      const handlePageTitleUpdated = (e: any) => {
        updateTab(activeTabId, {
          title: e.title || "New Tab",
          state: activeTab.state === "splash" ? "normal" : activeTab.state === "error" ? "normal" : activeTab.state,
          error: undefined,
        });

        // Update history with new title
        const currentUrl = webview.getURL();
        if (currentUrl && e.title) {
          addToHistory(currentUrl, e.title, activeTab.favicon);
        }
      };

      const handlePageFaviconUpdated = (e: any) => {
        updateTab(activeTabId, {
          favicon: e.favicons[0],
          state: activeTab.state === "splash" ? "normal" : activeTab.state === "error" ? "normal" : activeTab.state,
          error: undefined,
        });
      };

      const handleDomReady = () => {
        const currentTitle = webview.getTitle();
        const currentUrl = webview.getURL();
        if (currentTitle || currentUrl) {
          updateTab(activeTabId, {
            title: currentTitle || "New Tab",
            url: currentUrl,
            state: activeTab.state === "splash" ? "normal" : activeTab.state === "error" ? "normal" : activeTab.state,
            error: undefined,
          });
        }
      };

      const handleDidFailLoad = (event: any) => {
        // Only handle main frame errors, not subframe errors
        if (event.isMainFrame) {
          console.log(`🌐 [WebviewError] Main frame error detected:`, {
            errorCode: event.errorCode,
            errorDescription: event.errorDescription,
            validatedURL: event.validatedURL,
            isVPNConnected: vpnState.isConnected,
            currentServer: vpnState.isConnected
              ? `${vpnState.currentServer.country} (${vpnState.currentServer.ip}:${vpnState.currentServer.port})`
              : "N/A",
          });

          // Filter out internal Electron errors that shouldn't show error pages
          const ignoredErrorCodes = [
            "GUEST_VIEW_MANAGER_CALL",
            "ERR_ABORTED", // When user navigates away before page loads
            "ERR_FAILED", // Generic failure that's often not user-facing
          ];

          // Proxy connection failure error codes that should trigger auto-switch
          const proxyFailureErrorCodes = [
            "ERR_TUNNEL_CONNECTION_FAILED",
            "ERR_PROXY_CONNECTION_FAILED",
            "ERR_PROXY_AUTH_FAILED",
            "ERR_PROXY_AUTH_REQUESTED",
            "ERR_NO_SUPPORTED_PROXIES",
            "ERR_MANDATORY_PROXY_CONFIGURATION_FAILED",
            "ERR_PROXY_CERTIFICATE_INVALID",
          ];

          // Check if this is a proxy-related failure and VPN is connected
          if (proxyFailureErrorCodes.includes(event.errorCode) && vpnState.isConnected) {
            console.warn(`🚨 [ProxyFailure] Detected proxy failure: ${event.errorCode} - ${event.errorDescription}`);
            console.log(
              `🔄 [ProxyFailure] Current server: ${vpnState.currentServer.country} (${vpnState.currentServer.ip}:${vpnState.currentServer.port})`
            );
            console.log(`🔄 [ProxyFailure] Triggering automatic server switch...`);

            // Trigger automatic server switch
            handleAutoServerSwitch();

            // Don't show error page for proxy failures, let auto-switch handle it
            console.log("🔄 [ProxyFailure] Auto-switch triggered, avoiding error page display");
            return;
          }

          // Only show error page for actual navigation/network errors
          const userFacingErrorCodes = [
            "ERR_CERT_AUTHORITY_INVALID",
            "ERR_CERT_COMMON_NAME_INVALID",
            "ERR_CERT_DATE_INVALID",
            "ERR_INTERNET_DISCONNECTED",
            "ERR_NETWORK_CHANGED",
            "ERR_NAME_NOT_RESOLVED",
            "ERR_CONNECTION_REFUSED",
            "ERR_TIMED_OUT",
            "ERR_SSL_PROTOCOL_ERROR",
            "ERR_CERT_INVALID",
            "ERR_CONNECTION_RESET",
            "ERR_CONNECTION_CLOSED",
            "ERR_ADDRESS_UNREACHABLE",
            ...proxyFailureErrorCodes, // Include proxy errors in case auto-switch fails
          ];

          if (ignoredErrorCodes.includes(event.errorCode)) {
            console.log("Ignoring internal error:", event.errorCode);
            return;
          }

          // Only show error page for known user-facing errors or if it's a significant error
          if (userFacingErrorCodes.includes(event.errorCode) || event.errorCode.startsWith("ERR_")) {
            console.error("Webview failed to load:", event);
            updateTab(activeTabId, {
              title: `Error: ${event.errorCode}`,
              isLoading: false,
              state: "error",
              error: {
                code: event.errorCode,
                description: event.errorDescription,
                validatedURL: event.validatedURL,
              },
            });
          } else {
            // Log other errors but don't show error page
            console.log("Non-critical webview error:", event.errorCode, event.errorDescription);
          }
        }
      };

      webview.addEventListener("did-start-loading", handleStartLoading);
      webview.addEventListener("did-stop-loading", handleStopLoading);
      webview.addEventListener("did-navigate", handleNavigate);
      webview.addEventListener("did-navigate-in-page", handleNavigate);
      webview.addEventListener("page-title-updated", handlePageTitleUpdated);
      webview.addEventListener("page-favicon-updated", handlePageFaviconUpdated);
      webview.addEventListener("dom-ready", handleDomReady);
      webview.addEventListener("did-fail-load", handleDidFailLoad);

      return () => {
        webview.removeEventListener("did-start-loading", handleStartLoading);
        webview.removeEventListener("did-stop-loading", handleStopLoading);
        webview.removeEventListener("did-navigate", handleNavigate);
        webview.removeEventListener("did-navigate-in-page", handleNavigate);
        webview.removeEventListener("page-title-updated", handlePageTitleUpdated);
        webview.removeEventListener("page-favicon-updated", handlePageFaviconUpdated);
        webview.removeEventListener("dom-ready", handleDomReady);
        webview.removeEventListener("did-fail-load", handleDidFailLoad);
      };
    }
  }, [activeTabId, activeTab?.state]);

  // Ensure webview refs are cleaned up properly when tabs change
  useEffect(() => {
    // Clean up any webview refs that don't have corresponding tabs
    Object.keys(webviewRefs.current).forEach((refId) => {
      if (!tabs.some((tab) => tab.id === refId)) {
        delete webviewRefs.current[refId];
      }
    });

    // Ensure all tabs have webview refs
    tabs.forEach((tab) => {
      if (!webviewRefs.current[tab.id]) {
        webviewRefs.current[tab.id] = createRef<WebviewTag>();
      }
    });
  }, [tabs]);

  const handleHistoryClick = (url: string) => {
    const webview = webviewRefs.current[activeTabId]?.current;
    if (activeTab.state === "history") {
      // If we're in a history tab, navigate to a normal tab first
      updateTab(activeTabId, {
        state: "normal",
        url: url,
        title: "Loading...",
      });
    }
    if (webview) {
      webview.loadURL(url);
    }
  };

  const handleErrorRetry = () => {
    const webview = webviewRefs.current[activeTabId]?.current;
    if (webview && activeTab.error) {
      // Clear the error state and retry loading
      updateTab(activeTabId, {
        state: "normal",
        error: undefined,
        isLoading: true,
      });
      webview.reload();
    }
  };

  const handleErrorGoBack = () => {
    const webview = webviewRefs.current[activeTabId]?.current;
    if (webview && activeTab.canGoBack) {
      // Clear the error state and go back
      updateTab(activeTabId, {
        state: "normal",
        error: undefined,
      });
      webview.goBack();
    }
  };

  const handleNavigate = (url: string) => {
    const webview = webviewRefs.current[activeTabId]?.current;
    if (webview) {
      // Clear error state before navigation
      updateTab(activeTabId, {
        state: "normal",
        error: undefined,
        isLoading: true,
      });
      webview.loadURL(url);
    }
  };

  const handleRefresh = () => {
    const webview = webviewRefs.current[activeTabId]?.current;
    if (webview) {
      // Clear error state before refresh
      updateTab(activeTabId, {
        state: "normal",
        error: undefined,
        isLoading: true,
      });
      webview.reload();
    }
  };

  const handleGoBack = () => {
    const webview = webviewRefs.current[activeTabId]?.current;
    if (webview && activeTab.canGoBack) {
      // Clear error state before going back
      updateTab(activeTabId, {
        state: "normal",
        error: undefined,
      });
      webview.goBack();
    }
  };

  const handleGoForward = () => {
    const webview = webviewRefs.current[activeTabId]?.current;
    if (webview && activeTab.canGoForward) {
      // Clear error state before going forward
      updateTab(activeTabId, {
        state: "normal",
        error: undefined,
      });
      webview.goForward();
    }
  };

  const handleGoHome = () => {
    const webview = webviewRefs.current[activeTabId]?.current;
    if (webview) {
      // Clear error state before going home
      updateTab(activeTabId, {
        state: "normal",
        error: undefined,
        isLoading: true,
      });
      const homeUrl = "https://www.google.com";
      webview.loadURL(homeUrl);
    }
  };

  // Debounced automatic server switching function
  const handleAutoServerSwitch = useCallback(
    debounce(async () => {
      if (!vpnState.isConnected || isAutoSwitching || servers.length === 0) {
        return;
      }

      setIsAutoSwitching(true);

      try {
        const { ipcRenderer } = window.require("electron");

        // Mark current server as failed
        const currentServerId = vpnState.currentServer.id;
        setFailedServerIds((prev) => new Set(prev).add(currentServerId));

        // Get healthy servers that haven't failed recently, sorted by ping
        const availableServers = servers
          .filter((server) => server.ping !== null && !failedServerIds.has(server.id) && server.id !== currentServerId)
          .sort((a, b) => (a.ping || 0) - (b.ping || 0));

        if (availableServers.length === 0) {
          // Reset failed servers list if all are marked as failed
          setFailedServerIds(new Set());

          // Try with the full server list (excluding current)
          const fallbackServers = servers
            .filter((server) => server.ping !== null && server.id !== currentServerId)
            .sort((a, b) => (a.ping || 0) - (b.ping || 0));

          if (fallbackServers.length === 0) {
            return;
          }

          availableServers.push(...fallbackServers);
        }

        // Select the best available server (lowest ping)
        const newServer = availableServers[0];

        // Update VPN state
        const { setCurrentServer } = useVPNStore.getState();
        setCurrentServer(newServer);

        // Update proxy configuration
        const proxyConfig = {
          enabled: true,
          host: newServer.ip,
          port: newServer.port,
          type: "http" as const,
        };

        const result = await ipcRenderer.invoke("set-proxy-config", proxyConfig);

        if (result.success) {
          // Refresh current tab to use new proxy
          await ipcRenderer.invoke("refresh-current-tab");

          // Send auto-switch message to VPN dropdown
          const autoSwitchEvent = new CustomEvent("auto-switch-complete", {
            detail: {
              newServer: newServer,
              message: `Auto-switched to ${newServer.country} due to connection issues`,
            },
          });
          window.dispatchEvent(autoSwitchEvent);

          // Show notification to user
          if (window.Notification && Notification.permission === "granted") {
            new Notification("Server Auto-Switched", {
              body: `Switched to ${newServer.country} due to connection issues`,
              icon: icognifiLogo,
            });
          }
        }
      } catch (error) {
        // Error handling without console logs
      } finally {
        setIsAutoSwitching(false);

        // Clear failed servers list after 5 minutes to allow retry
        setTimeout(() => {
          setFailedServerIds(new Set());
        }, 5 * 60 * 1000);
      }
    }, 10000), // Debounce auto-switch attempts to max once per 10 seconds
    [vpnState.isConnected, isAutoSwitching, servers.length, vpnState.currentServer.id, failedServerIds]
  );

  return (
    <div className="flex flex-col h-screen bg-white">
      <TitleBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={setActiveTabId}
        onTabClose={closeTab}
        onNewTab={createTab}
        onOpenHistory={openHistoryTab}
      />

      {activeTab?.state !== "history" && (
        <>
          <NavigationBar
            displayUrl={activeTab.state === "splash" ? "icognifi://home" : activeTab.url}
            isLoading={activeTab.isLoading}
            canGoBack={activeTab.canGoBack}
            canGoForward={activeTab.canGoForward}
            bookmarks={bookmarks}
            inputRef={inputRef}
            webviewRef={webviewRefs.current[activeTabId]!}
            onAddBookmark={addBookmark}
            onInputFocus={() => {}}
            onInputBlur={() => {}}
            onNavigate={handleNavigate}
            onRefresh={handleRefresh}
            onGoBack={handleGoBack}
            onGoForward={handleGoForward}
            onGoHome={handleGoHome}
          />

          <BookmarksBar
            bookmarks={bookmarks}
            webviewRef={webviewRefs.current[activeTabId]!}
            onRemoveBookmark={removeBookmark}
            onBookmarkClick={(url) => {
              const webview = webviewRefs.current[activeTabId]?.current;
              if (activeTab.state === "splash") {
                updateTab(activeTabId, {
                  state: "normal",
                });
              } else if (activeTab.state === "error") {
                // Clear error state before bookmark navigation
                updateTab(activeTabId, {
                  state: "normal",
                  error: undefined,
                  isLoading: true,
                });
              }
              if (webview) {
                webview.loadURL(url);
              }
            }}
          />
        </>
      )}

      {/* Webviews, History Page, and Error Pages */}
      <div className="flex-1 bg-white relative overflow-hidden">
        {tabs.map((tab) => {
          if (tab.state === "history") {
            return (
              <div
                key={tab.id}
                className={`h-full w-full ${tab.id === activeTabId ? "block" : "hidden"}`}
              >
                <HistoryPage
                  history={history}
                  onHistoryClick={handleHistoryClick}
                  onRemoveHistoryEntry={removeHistoryEntry}
                  onClearHistory={clearHistory}
                />
              </div>
            );
          }

          if (tab.state === "error" && tab.error) {
            return (
              <div
                key={tab.id}
                className={`h-full w-full ${tab.id === activeTabId ? "block" : "hidden"}`}
              >
                <ErrorPage
                  error={tab.error}
                  onRetry={handleErrorRetry}
                  onGoBack={handleErrorGoBack}
                  canGoBack={tab.canGoBack}
                />
              </div>
            );
          }

          return tab.state === "splash" ? (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`h-full w-full overflow-auto bg-gradient-to-br from-violet-50 to-indigo-50 ${
                tab.id === activeTabId ? "block" : "hidden"
              }`}
            >
              <div className="flex flex-col items-center justify-start min-h-full py-8">
                <div className="flex flex-col items-center justify-center max-w-4xl w-full px-4">
                  <motion.img
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    src={icognifiLogo}
                    alt="IcogniFi"
                    className="w-24 h-24 mb-3 object-contain"
                  />
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-2xl font-semibold text-violet-900 mb-3"
                  >
                    Welcome to IcogniFi - Hot Reload Test!
                  </motion.h1>
                  <div className="w-full text-center space-y-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="text-base text-gray-600"
                    >
                      Your secure and private browsing experience starts here. Enjoy these features:
                    </motion.p>
                    <div className="grid grid-cols-3 gap-4 px-4">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105"
                      >
                        <ShieldCheckIcon className="w-8 h-8 text-violet-600 mb-2 mx-auto" />
                        <h3 className="text-lg font-medium text-violet-700 mb-1">Built-in VPN</h3>
                        <p className="text-sm text-gray-600">Browse securely with our integrated VPN service</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105"
                      >
                        <GlobeAltIcon className="w-8 h-8 text-violet-600 mb-2 mx-auto" />
                        <h3 className="text-lg font-medium text-violet-700 mb-1">Private Browsing</h3>
                        <p className="text-sm text-gray-600">Enhanced privacy features to protect your data</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                        className="p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105"
                      >
                        <UserGroupIcon className="w-8 h-8 text-violet-600 mb-2 mx-auto" />
                        <h3 className="text-lg font-medium text-violet-700 mb-1">Social Features</h3>
                        <p className="text-sm text-gray-600">Connect with friends while maintaining privacy</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        className="p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105"
                      >
                        <BookmarkIcon className="w-8 h-8 text-violet-600 mb-2 mx-auto" />
                        <h3 className="text-lg font-medium text-violet-700 mb-1">Bookmarks</h3>
                        <p className="text-sm text-gray-600">Easily save and organize your favorite sites</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.9 }}
                        className="p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105"
                      >
                        <LockClosedIcon className="w-8 h-8 text-violet-600 mb-2 mx-auto" />
                        <h3 className="text-lg font-medium text-violet-700 mb-1">Password Manager</h3>
                        <p className="text-sm text-gray-600">Coming Soon - Securely store and manage your passwords</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 1.0 }}
                        className="p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105 opacity-70"
                      >
                        <CogIcon className="w-8 h-8 text-violet-600 mb-2 mx-auto" />
                        <h3 className="text-lg font-medium text-violet-700 mb-1">Advanced Settings</h3>
                        <p className="text-sm text-gray-600">Coming Soon - Customize your browsing experience</p>
                      </motion.div>
                    </div>
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.9 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        updateTab(tab.id, { state: "normal" });
                        const webview = webviewRefs.current[tab.id]?.current;
                        if (webview) {
                          webview.loadURL("https://www.google.com");
                        }
                      }}
                      className="px-6 py-2 bg-violet-600 text-white text-base rounded-xl hover:bg-violet-700 transition-colors shadow-md hover:shadow-lg mt-8 mb-2"
                    >
                      Start Browsing
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div
              key={tab.id}
              className={`absolute inset-0 ${tab.id === activeTabId ? "block" : "hidden"}`}
            >
              <webview
                ref={webviewRefs.current[tab.id]}
                src={tab.url}
                className="w-full h-full"
                partition="persist:webview"
                allowpopups
                nodeintegration
                webpreferences="contextIsolation=false"
              />
            </div>
          );
        })}
      </div>

      {/* Social Bar */}
      <SocialBar />
    </div>
  );
}
