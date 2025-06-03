import { app, BrowserWindow, Menu, dialog, ipcMain, session } from "electron";
import path from "path";
import fs from "fs";
import si from "systeminformation";
import axios from "axios";

// Set the app name
app.name = "IcogniFi";

// Network monitoring state
let networkBaseline: any = null;
let lastNetworkStats: any = null;
let sessionStartTime: number = 0;

// Proxy state
interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: "socks5" | "socks4" | "http";
}

// Load proxy config from storage or use defaults
function loadProxyConfig(): ProxyConfig {
  try {
    const stored = app.getPath("userData");
    const configPath = path.join(stored, "proxy-config.json");

    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load proxy config:", error);
  }

  return {
    enabled: false,
    host: "127.0.0.1",
    port: 1080,
    type: "socks5",
  };
}

// Save proxy config to storage
function saveProxyConfig(config: ProxyConfig) {
  try {
    const stored = app.getPath("userData");
    const configPath = path.join(stored, "proxy-config.json");

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Proxy config saved:", config);
  } catch (error) {
    console.error("Failed to save proxy config:", error);
  }
}

let currentProxyConfig: ProxyConfig = loadProxyConfig();

// Initialize network monitoring baseline
async function initializeNetworkMonitoring() {
  try {
    const networkStats = await si.networkStats();
    const networkInterfaces = await si.networkInterfaces();

    // Get the primary network interface
    const primaryInterface =
      networkInterfaces.find((iface) => iface.default || iface.ip4) ||
      networkInterfaces.find((iface) => !iface.internal && iface.ip4) ||
      networkInterfaces[0];

    // Find matching network stats for the primary interface
    const primaryStats = networkStats.find((stat) => stat.iface === primaryInterface?.iface) || networkStats[0];

    if (primaryStats) {
      networkBaseline = {
        rx_bytes: primaryStats.rx_bytes,
        tx_bytes: primaryStats.tx_bytes,
        interfaceName: primaryStats.iface,
      };

      lastNetworkStats = {
        rx_bytes: primaryStats.rx_bytes,
        tx_bytes: primaryStats.tx_bytes,
        timestamp: Date.now(),
      };

      sessionStartTime = Date.now();
      console.log(`Network monitoring initialized for interface: ${primaryStats.iface}`);
    }
  } catch (error) {
    console.error("Failed to initialize network monitoring:", error);
  }
}

// Function to get network statistics
async function getNetworkStats() {
  try {
    const networkStats = await si.networkStats();
    const networkInterfaces = await si.networkInterfaces();

    // Get the primary network interface (usually the one with a default route or IP)
    const primaryInterface =
      networkInterfaces.find((iface) => iface.default || iface.ip4) ||
      networkInterfaces.find((iface) => !iface.internal && iface.ip4) ||
      networkInterfaces[0];

    // Find matching network stats for the primary interface
    const primaryStats = networkStats.find((stat) => stat.iface === primaryInterface?.iface) || networkStats[0];

    if (!primaryStats || !networkBaseline) {
      return {
        downloadSpeed: 0,
        uploadSpeed: 0,
        totalDownload: 0,
        totalUpload: 0,
        sessionDuration: 0,
        isConnected: false,
      };
    }

    // Calculate session totals (relative to baseline)
    const sessionDownload = Math.max(0, primaryStats.rx_bytes - networkBaseline.rx_bytes);
    const sessionUpload = Math.max(0, primaryStats.tx_bytes - networkBaseline.tx_bytes);

    // Calculate speeds if we have previous data
    let downloadSpeed = 0;
    let uploadSpeed = 0;

    if (lastNetworkStats && primaryStats.ms > 0) {
      const timeDiff = primaryStats.ms / 1000; // Convert to seconds
      const downloadDiff = primaryStats.rx_bytes - lastNetworkStats.rx_bytes;
      const uploadDiff = primaryStats.tx_bytes - lastNetworkStats.tx_bytes;

      downloadSpeed = Math.max(0, downloadDiff / timeDiff);
      uploadSpeed = Math.max(0, uploadDiff / timeDiff);
    }

    // Store current stats for next calculation
    lastNetworkStats = {
      rx_bytes: primaryStats.rx_bytes,
      tx_bytes: primaryStats.tx_bytes,
      timestamp: Date.now(),
    };

    // Calculate session duration
    const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);

    return {
      downloadSpeed,
      uploadSpeed,
      totalDownload: sessionDownload,
      totalUpload: sessionUpload,
      sessionDuration,
      isConnected: !!primaryInterface?.ip4,
    };
  } catch (error) {
    console.error("Error getting network stats:", error);
    return {
      downloadSpeed: 0,
      uploadSpeed: 0,
      totalDownload: 0,
      totalUpload: 0,
      sessionDuration: 0,
      isConnected: false,
    };
  }
}

// Function to configure proxy for webview sessions
async function configureProxy(config: ProxyConfig) {
  console.log("Configuring proxy with config:", config);
  const webviewSession = session.fromPartition("persist:webview");

  if (config.enabled) {
    let proxyRules = "";

    if (config.username && config.password) {
      // For authenticated proxies
      proxyRules =
        config.type === "socks5"
          ? `socks5://${config.username}:${config.password}@${config.host}:${config.port}`
          : config.type === "socks4"
          ? `socks4://${config.username}:${config.password}@${config.host}:${config.port}`
          : `http://${config.username}:${config.password}@${config.host}:${config.port}`;
    } else {
      // For non-authenticated proxies
      proxyRules =
        config.type === "socks5"
          ? `socks5://${config.host}:${config.port}`
          : config.type === "socks4"
          ? `socks4://${config.host}:${config.port}`
          : `http://${config.host}:${config.port}`;
    }

    try {
      await webviewSession.setProxy({
        proxyRules: proxyRules,
        proxyBypassRules: "localhost,127.0.0.1,::1",
      });

      console.log(`Proxy configured successfully: ${proxyRules}`);
      return { success: true, message: `Proxy enabled: ${config.type}://${config.host}:${config.port}` };
    } catch (error) {
      console.error("Failed to configure proxy:", error);
      return {
        success: false,
        message: "Failed to configure proxy: " + (error instanceof Error ? error.message : String(error)),
      };
    }
  } else {
    try {
      await webviewSession.setProxy({
        proxyRules: "direct://",
      });

      console.log("Proxy disabled successfully");
      return { success: true, message: "Proxy disabled" };
    } catch (error) {
      console.error("Failed to disable proxy:", error);
      return {
        success: false,
        message: "Failed to disable proxy: " + (error instanceof Error ? error.message : String(error)),
      };
    }
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "IcogniFi",
    icon: path.join(__dirname, "../renderer/assets/icognifi-alpha.png"),
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 20, y: 20 },
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: false,
      sandbox: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
    },
  });

  // Hide the menu bar completely on all platforms
  Menu.setApplicationMenu(null);

  // Show window when ready to prevent white screen
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    console.log("Window is ready to show");
  });

  // Add error handling for renderer process
  mainWindow.webContents.on("crashed", (event) => {
    console.error("Renderer process crashed:", event);
  });

  mainWindow.webContents.on("unresponsive", () => {
    console.error("Renderer process became unresponsive");
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("Failed to load main window:", {
      errorCode,
      errorDescription,
      validatedURL,
    });
  });

  // Set up IPC handlers for settings
  ipcMain.handle("clear-storage", async () => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      buttons: ["Cancel", "Clear Storage"],
      defaultId: 0,
      title: "Clear Storage",
      message: "Are you sure you want to clear all storage?",
      detail: "This will remove all bookmarks and reset the browser to its default state.",
    });

    if (response === 1) {
      // User clicked "Clear Storage"
      mainWindow.webContents.session.clearStorageData();
      mainWindow.webContents.reload();
      return { success: true };
    }
    return { success: false };
  });

  // Set up IPC handler for network stats
  ipcMain.handle("get-network-stats", async () => {
    return await getNetworkStats();
  });

  // Set up IPC handlers for proxy management
  ipcMain.handle("get-proxy-config", async () => {
    console.log("Getting proxy config:", currentProxyConfig);
    return currentProxyConfig;
  });

  ipcMain.handle("set-proxy-config", async (event, config: ProxyConfig) => {
    console.log("Setting proxy config:", config);
    console.log("Previous config was:", currentProxyConfig);
    currentProxyConfig = { ...config };
    saveProxyConfig(currentProxyConfig);
    const result = await configureProxy(currentProxyConfig);
    console.log("Proxy configuration result:", result);
    console.log("New current config is:", currentProxyConfig);
    return result;
  });

  ipcMain.handle("toggle-proxy", async () => {
    console.log("Toggling proxy. Current state:", currentProxyConfig.enabled);
    console.log("Current config before toggle:", currentProxyConfig);
    currentProxyConfig.enabled = !currentProxyConfig.enabled;
    saveProxyConfig(currentProxyConfig);
    const result = await configureProxy(currentProxyConfig);
    console.log("Proxy toggle result:", result, "New state:", currentProxyConfig.enabled);
    console.log("Final config after toggle:", currentProxyConfig);
    return { ...result, enabled: currentProxyConfig.enabled };
  });

  ipcMain.handle("test-proxy-connection", async () => {
    // Basic proxy connection test
    try {
      const testSession = session.fromPartition("test-proxy");
      if (currentProxyConfig.enabled) {
        const proxyRules =
          currentProxyConfig.type === "socks5"
            ? `socks5://${currentProxyConfig.host}:${currentProxyConfig.port}`
            : currentProxyConfig.type === "socks4"
            ? `socks4://${currentProxyConfig.host}:${currentProxyConfig.port}`
            : `http://${currentProxyConfig.host}:${currentProxyConfig.port}`;

        await testSession.setProxy({
          proxyRules: proxyRules,
        });
      }

      return { success: true, message: "Proxy connection successful" };
    } catch (error) {
      return { success: false, message: "Proxy connection failed" };
    }
  });

  // Test a specific proxy server by trying to fetch a test website through it
  ipcMain.handle("test-proxy-server", async (event, proxyServer: { ip: string; port: number; type?: string }) => {
    try {
      const proxyType = proxyServer.type || "http";
      const startTime = Date.now();

      // Configure axios with proxy settings
      const axiosConfig = {
        timeout: 15000, // 5 second timeout
        proxy: false, // Disable default proxy to use our custom proxy
        httpsAgent: false,
        httpAgent: false,
      } as any;

      // Configure proxy based on type
      if (proxyType === "http") {
        axiosConfig.proxy = {
          protocol: "http",
          host: proxyServer.ip,
          port: proxyServer.port,
        };
      } else if (proxyType === "socks5" || proxyType === "socks4") {
        // For SOCKS proxies, we need to use a different approach
        // Since axios doesn't directly support SOCKS, we'll use a simpler HTTP test
        // This is a limitation but much more lightweight than BrowserWindow
        axiosConfig.proxy = {
          protocol: "http", // Fallback to HTTP test even for SOCKS proxies
          host: proxyServer.ip,
          port: proxyServer.port,
        };
      }

      try {
        // Try to fetch a simple test endpoint through the proxy
        await axios.get("https://httpbin.org/ip", axiosConfig);

        const endTime = Date.now();
        const ping = endTime - startTime;

        console.log(
          `✅ [test-proxy-server] Proxy test successful for ${proxyServer.ip}:${proxyServer.port} - ${ping}ms`
        );
        return { success: true, ping, error: null };
      } catch (error) {
        const endTime = Date.now();
        const ping = endTime - startTime;

        // If the request failed, it could be due to proxy issues or network issues
        // We'll still return the timing information for failed requests
        console.warn(
          `❌ [test-proxy-server] Proxy test failed for ${proxyServer.ip}:${proxyServer.port}:`,
          error instanceof Error ? error.message : String(error)
        );
        return {
          success: false,
          ping: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } catch (error) {
      console.error(`💥 [test-proxy-server] Error testing proxy ${proxyServer.ip}:${proxyServer.port}:`, error);
      return {
        success: false,
        ping: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Add IPC handler to refresh current tab after server switch
  ipcMain.handle("refresh-current-tab", async () => {
    try {
      // Send message to renderer to refresh the current tab
      mainWindow.webContents.send("refresh-current-tab");
      return { success: true };
    } catch (error) {
      console.error("Failed to refresh current tab:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Load the appropriate content based on environment
  const isDevelopment = process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "true";
  const isPackaged = app.isPackaged;
  const devServerUrl = "http://localhost:5173";

  console.log("Environment check:", {
    NODE_ENV: process.env.NODE_ENV,
    ELECTRON_IS_DEV: process.env.ELECTRON_IS_DEV,
    isPackaged,
    isDevelopment,
  });

  // Check if dev server is available
  if (isDevelopment && !isPackaged) {
    console.log("Development mode detected, attempting to load dev server...");
    try {
      // Try to load dev server
      mainWindow.loadURL(devServerUrl);
    } catch (error) {
      console.log("Dev server not available, falling back to production files");
      loadProductionFiles();
    }
  } else {
    console.log("Production mode detected, loading built files...");
    loadProductionFiles();
  }

  function loadProductionFiles() {
    const htmlPath = path.join(__dirname, "..", "renderer", "index.html");
    console.log("Loading production file from:", htmlPath);
    console.log("File exists:", fs.existsSync(htmlPath));
    console.log("Current working directory:", process.cwd());
    console.log("__dirname:", __dirname);

    // Verify the file exists before trying to load it
    if (fs.existsSync(htmlPath)) {
      mainWindow.loadFile(htmlPath);
    } else {
      // Fallback path resolution for different environments
      const fallbackPath = path.resolve(process.cwd(), "dist", "renderer", "index.html");
      console.log("Trying fallback path:", fallbackPath);
      console.log("Fallback file exists:", fs.existsSync(fallbackPath));

      if (fs.existsSync(fallbackPath)) {
        mainWindow.loadFile(fallbackPath);
      } else {
        console.error("Could not find index.html file in either location");
        // Load a minimal error page
        mainWindow.loadURL(`data:text/html,
          <html>
            <head><title>Error</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h1>File Not Found</h1>
              <p>Could not load the application. Please reinstall.</p>
              <p><strong>Searched paths:</strong></p>
              <ul>
                <li>${htmlPath}</li>
                <li>${fallbackPath}</li>
              </ul>
              <p><strong>Environment Info:</strong></p>
              <ul>
                <li>NODE_ENV: ${process.env.NODE_ENV}</li>
                <li>isPackaged: ${isPackaged}</li>
                <li>__dirname: ${__dirname}</li>
                <li>process.cwd(): ${process.cwd()}</li>
              </ul>
            </body>
          </html>
        `);
      }
    }
  }

  // Initialize proxy configuration if it was previously enabled
  if (currentProxyConfig.enabled) {
    console.log("Initializing proxy with saved config...");
    configureProxy(currentProxyConfig).then((result) => {
      console.log("Proxy initialization result:", result);
    });
  }

  // DevTools can be opened manually via the menu if needed for debugging
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  // Initialize network monitoring baseline
  initializeNetworkMonitoring();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Clean up IPC handlers when app is quitting
app.on("before-quit", () => {
  ipcMain.removeAllListeners("clear-storage");
  ipcMain.removeAllListeners("get-network-stats");
  ipcMain.removeAllListeners("get-proxy-config");
  ipcMain.removeAllListeners("set-proxy-config");
  ipcMain.removeAllListeners("toggle-proxy");
  ipcMain.removeAllListeners("test-proxy-connection");
  ipcMain.removeAllListeners("test-proxy-server");
  ipcMain.removeAllListeners("refresh-current-tab");
});
