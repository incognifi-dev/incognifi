import { useState, useRef, useEffect, createRef } from "react";
import type { WebviewTag } from "electron";
import { NavigationBar } from "./components/NavigationBar";
import { BookmarksBar } from "./components/BookmarksBar";
import { TabsBar } from "./components/TabsBar";
import { TitleBar } from "./components/TitleBar";
import { SocialBar } from "./components/SocialBar";
import { Bookmark, Tab } from "./types";
import { defaultBookmarks } from "./data/defaultBookmarks";
import icognifiLogo from "./assets/icognifi-alpha.png";
import { motion } from "framer-motion";
import {
  ShieldCheckIcon,
  UserGroupIcon,
  BookmarkIcon,
  GlobeAltIcon,
  LockClosedIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

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

  const webviewRefs = useRef<{ [key: string]: React.RefObject<WebviewTag> }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId)!;

  // Initialize ref for new tab
  if (!webviewRefs.current[activeTabId]) {
    webviewRefs.current[activeTabId] = createRef<WebviewTag>();
  }

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

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
    if (webview) {
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
          state: activeTab.state === "splash" ? "normal" : activeTab.state,
        });
      };

      const handlePageTitleUpdated = (e: any) => {
        updateTab(activeTabId, {
          title: e.title || "New Tab",
          state: activeTab.state === "splash" ? "normal" : activeTab.state,
        });
      };

      const handlePageFaviconUpdated = (e: any) => {
        updateTab(activeTabId, {
          favicon: e.favicons[0],
          state: activeTab.state === "splash" ? "normal" : activeTab.state,
        });
      };

      const handleDomReady = () => {
        const currentTitle = webview.getTitle();
        const currentUrl = webview.getURL();
        if (currentTitle || currentUrl) {
          updateTab(activeTabId, {
            title: currentTitle || "New Tab",
            url: currentUrl,
            state: activeTab.state === "splash" ? "normal" : activeTab.state,
          });
        }
      };

      webview.addEventListener("did-start-loading", handleStartLoading);
      webview.addEventListener("did-stop-loading", handleStopLoading);
      webview.addEventListener("did-navigate", handleNavigate);
      webview.addEventListener("did-navigate-in-page", handleNavigate);
      webview.addEventListener("page-title-updated", handlePageTitleUpdated);
      webview.addEventListener("page-favicon-updated", handlePageFaviconUpdated);
      webview.addEventListener("dom-ready", handleDomReady);

      return () => {
        webview.removeEventListener("did-start-loading", handleStartLoading);
        webview.removeEventListener("did-stop-loading", handleStopLoading);
        webview.removeEventListener("did-navigate", handleNavigate);
        webview.removeEventListener("did-navigate-in-page", handleNavigate);
        webview.removeEventListener("page-title-updated", handlePageTitleUpdated);
        webview.removeEventListener("page-favicon-updated", handlePageFaviconUpdated);
        webview.removeEventListener("dom-ready", handleDomReady);
      };
    }
  }, [activeTabId, activeTab.state]);

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

  return (
    <div className="flex flex-col h-screen bg-white">
      <TitleBar />

      <TabsBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={setActiveTabId}
        onTabClose={closeTab}
        onNewTab={createTab}
      />

      <NavigationBar
        inputUrl={activeTab.state === "splash" ? "icognifi://home" : activeTab.url}
        displayUrl={activeTab.state === "splash" ? "icognifi://home" : activeTab.url}
        isLoading={activeTab.isLoading}
        canGoBack={activeTab.canGoBack}
        canGoForward={activeTab.canGoForward}
        bookmarks={bookmarks}
        inputRef={inputRef}
        webviewRef={webviewRefs.current[activeTabId]!}
        onUrlChange={(url) => updateTab(activeTabId, { url })}
        onAddBookmark={addBookmark}
        onInputFocus={() => {}}
        onInputBlur={() => {}}
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
          }
          if (webview) {
            webview.loadURL(url);
          }
        }}
      />

      {/* Webviews */}
      <div className="flex-1 bg-white relative overflow-hidden">
        {tabs.map((tab) => {
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
                    Welcome to IcogniFi
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
