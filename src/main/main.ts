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

// Proxy state - Updated for Oxylabs
interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: "socks5" | "socks4" | "http";
}

interface OxylabsConfig {
  customerId: string;
  password: string;
  countryCode: string;
  sessionId?: string;
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
    host: "pr.oxylabs.io",
    port: 7777,
    type: "http",
  };
}

// Load Oxylabs config from storage
function loadOxylabsConfig(): OxylabsConfig | null {
  try {
    const stored = app.getPath("userData");
    const configPath = path.join(stored, "oxylabs-config.json");

    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load Oxylabs config:", error);
  }

  return null;
}

// Save Oxylabs config to storage
function saveOxylabsConfig(config: OxylabsConfig) {
  try {
    const stored = app.getPath("userData");
    const configPath = path.join(stored, "oxylabs-config.json");

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Oxylabs config saved:", { ...config, password: "***" });
  } catch (error) {
    console.error("Failed to save Oxylabs config:", error);
  }
}

// Save proxy config to storage
function saveProxyConfig(config: ProxyConfig) {
  try {
    const stored = app.getPath("userData");
    const configPath = path.join(stored, "proxy-config.json");

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Proxy config saved:", { ...config, password: config.password ? "***" : undefined });
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

// Function to update webview session proxy for runtime changes
async function updateWebviewProxy(config: ProxyConfig) {
  console.log("Updating webview proxy with config:", { ...config, password: config.password ? "***" : undefined });
  const webviewSession = session.fromPartition("persist:webview");

  if (config.enabled && config.username && config.password) {
    try {
      // Clear any cached authentication data to force re-authentication
      console.log("Clearing webview session auth cache before proxy update");
      await webviewSession.clearAuthCache();

      // Clear any cached proxy authentication specifically
      await webviewSession.clearHostResolverCache();

      // Use both HTTP and HTTPS proxy rules for complete coverage
      const proxyRules = `http=${config.host}:${config.port};https=${config.host}:${config.port}`;

      console.log("Setting webview proxy rules:", proxyRules);
      console.log("Proxy username:", config.username);

      await webviewSession.setProxy({
        proxyRules: proxyRules,
        proxyBypassRules: "localhost,127.0.0.1,::1,<local>",
      });

      // Additional step: Clear any cached connections to force new authentication
      console.log("Clearing cache to ensure new proxy credentials are used");
      await webviewSession.clearCache();

      console.log(`Webview proxy updated successfully: ${config.host}:${config.port} with authentication`);
      return { success: true, message: `Proxy updated: ${config.host}:${config.port}` };
    } catch (error) {
      console.error("Failed to update webview proxy:", error);
      return {
        success: false,
        message: "Failed to update proxy: " + (error instanceof Error ? error.message : String(error)),
      };
    }
  } else {
    try {
      console.log("Disabling webview proxy by setting direct connection");

      // Clear cached data when disabling proxy
      await webviewSession.clearAuthCache();
      await webviewSession.clearHostResolverCache();

      await webviewSession.setProxy({
        proxyRules: "direct://",
      });

      console.log("Webview proxy disabled successfully");
      return { success: true, message: "Proxy disabled" };
    } catch (error) {
      console.error("Failed to disable webview proxy:", error);
      return {
        success: false,
        message: "Failed to disable proxy: " + (error instanceof Error ? error.message : String(error)),
      };
    }
  }
}

// Initialize proxy at app startup if Oxylabs config exists
function initializeAppProxy() {
  const savedOxylabsConfig = loadOxylabsConfig();
  if (savedOxylabsConfig) {
    console.log("Initializing Oxylabs proxy at app startup...");

    // Build Oxylabs username
    let username = `customer-${savedOxylabsConfig.customerId}-cc-${savedOxylabsConfig.countryCode}`;
    if (savedOxylabsConfig.sessionId && savedOxylabsConfig.sessionId.trim() !== "") {
      username += `-session-${savedOxylabsConfig.sessionId}`;
    }

    // Set proxy at Chromium command line level
    const proxyUrl = `http://pr.oxylabs.io:7777`;
    const proxyConfig = `http=${proxyUrl};https=${proxyUrl}`;

    console.log("Setting proxy via command line:", proxyConfig);
    console.log("Proxy username:", username);

    app.commandLine.appendSwitch("proxy-server", proxyConfig);

    // Update current proxy config for authentication
    currentProxyConfig = {
      enabled: true,
      host: "pr.oxylabs.io",
      port: 7777,
      type: "http",
      username: username,
      password: savedOxylabsConfig.password,
    };

    console.log("Oxylabs proxy initialized via command line");
  } else {
    console.log("No Oxylabs config found, no proxy set");
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

  // Set up proxy authentication handler
  app.on("login", (event, webContents, request, authInfo, callback) => {
    console.log("🔐 [Auth Handler] Authentication requested:", {
      isProxy: authInfo.isProxy,
      host: authInfo.host,
      port: authInfo.port,
      scheme: authInfo.scheme,
      realm: authInfo.realm,
    });

    if (authInfo.isProxy && currentProxyConfig.enabled && currentProxyConfig.username && currentProxyConfig.password) {
      console.log(`🔑 [Auth Handler] Providing proxy credentials for: ${authInfo.host}`);
      console.log(`👤 [Auth Handler] Using username: ${currentProxyConfig.username}`);
      console.log(
        `🌍 [Auth Handler] Country from username: ${
          currentProxyConfig.username.includes("-cc-")
            ? currentProxyConfig.username.split("-cc-")[1].split("-")[0]
            : "Unknown"
        }`
      );

      event.preventDefault();
      callback(currentProxyConfig.username, currentProxyConfig.password);

      console.log(`✅ [Auth Handler] Credentials provided successfully`);
    } else {
      console.log("❌ [Auth Handler] No proxy credentials available or not a proxy auth request");
      console.log(`🔍 [Auth Handler] Current proxy config:`, {
        enabled: currentProxyConfig.enabled,
        hasUsername: !!currentProxyConfig.username,
        hasPassword: !!currentProxyConfig.password,
        isProxyRequest: authInfo.isProxy,
      });
    }
  });

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

  // Set up IPC handlers for Oxylabs management
  ipcMain.handle("get-oxylabs-config", async () => {
    console.log("Getting Oxylabs config");
    return loadOxylabsConfig();
  });

  ipcMain.handle("save-oxylabs-config", async (event, config: OxylabsConfig) => {
    console.log("Saving Oxylabs config:", { ...config, password: "***" });

    try {
      // Save the configuration
      saveOxylabsConfig(config);

      // Build Oxylabs username for current config
      let username = `customer-${config.customerId}-cc-${config.countryCode}`;
      if (config.sessionId && config.sessionId.trim() !== "") {
        username += `-session-${config.sessionId}`;
      }

      console.log(`🔄 [save-oxylabs-config] Building new proxy config with username: ${username}`);

      // Update current proxy config FIRST - this is critical for the authentication handler
      const newProxyConfig: ProxyConfig = {
        enabled: true,
        host: "pr.oxylabs.io",
        port: 7777,
        type: "http",
        username: username,
        password: config.password,
      };

      // Update global proxy config before webview update
      currentProxyConfig = newProxyConfig;
      saveProxyConfig(currentProxyConfig);

      console.log(`✅ [save-oxylabs-config] Updated global proxy config for country: ${config.countryCode}`);
      console.log(`🔑 [save-oxylabs-config] Authentication will use username: ${username}`);

      // Add a small delay to ensure the authentication handler has the updated config
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now update the webview proxy
      console.log(`🌐 [save-oxylabs-config] Updating webview proxy for ${config.countryCode}...`);
      const result = await updateWebviewProxy(newProxyConfig);

      if (result.success) {
        console.log(`✅ [save-oxylabs-config] Webview proxy updated successfully for ${config.countryCode}`);
        return {
          success: true,
          message: `Successfully switched to ${config.countryCode} - Oxylabs configuration saved and proxy updated!`,
        };
      } else {
        console.error(`❌ [save-oxylabs-config] Failed to update webview proxy:`, result.message);
        return {
          success: false,
          message: `Configuration saved but failed to update proxy: ${result.message}`,
        };
      }
    } catch (error) {
      console.error("Failed to save Oxylabs config:", error);
      return {
        success: false,
        message: "Failed to save Oxylabs configuration: " + (error instanceof Error ? error.message : String(error)),
      };
    }
  });

  ipcMain.handle("test-oxylabs-connection", async (event, config: OxylabsConfig) => {
    console.log("Testing Oxylabs connection for:", { ...config, password: "***" });

    try {
      // Build Oxylabs username
      let username = `customer-${config.customerId}-cc-${config.countryCode}`;
      if (config.sessionId && config.sessionId.trim() !== "") {
        username += `-session-${config.sessionId}`;
      }

      const axiosConfig = {
        timeout: 15000,
        proxy: {
          protocol: "http",
          host: "pr.oxylabs.io",
          port: 7777,
          auth: {
            username: username,
            password: config.password,
          },
        },
      };

      console.log("Testing connection with username:", username);

      // Test the connection by fetching IP info
      const response = await axios.get("https://ip.oxylabs.io/location", axiosConfig);

      if (response.status === 200 && response.data) {
        console.log("✅ Oxylabs connection test successful:", response.data);
        return {
          success: true,
          ip: response.data.ip || "Unknown",
          location: response.data.country || response.data.location || "Unknown",
          message: "Connection successful!",
        };
      } else {
        console.warn("❌ Oxylabs connection test failed - unexpected response");
        return {
          success: false,
          message: "Unexpected response from Oxylabs",
        };
      }
    } catch (error) {
      console.error("💥 Oxylabs connection test failed:", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 407) {
          return {
            success: false,
            message: "Authentication failed - please check your credentials",
          };
        } else if (error.response?.status === 403) {
          return {
            success: false,
            message: "Access forbidden - please check your account permissions",
          };
        } else if (error.code === "ECONNREFUSED") {
          return {
            success: false,
            message: "Connection refused - unable to reach Oxylabs proxy server",
          };
        } else if (error.code === "ETIMEDOUT") {
          return {
            success: false,
            message: "Connection timeout - please try again",
          };
        }
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown connection error",
      };
    }
  });

  // Update existing proxy handlers to work with new system
  ipcMain.handle("get-proxy-config", async () => {
    console.log("Getting proxy config:", {
      ...currentProxyConfig,
      password: currentProxyConfig.password ? "***" : undefined,
    });
    return currentProxyConfig;
  });

  ipcMain.handle("set-proxy-config", async (event, config: ProxyConfig) => {
    console.log("Setting proxy config:", { ...config, password: config.password ? "***" : undefined });
    currentProxyConfig = { ...config };
    saveProxyConfig(currentProxyConfig);

    // Immediately update the webview proxy
    const result = await updateWebviewProxy(currentProxyConfig);
    return result;
  });

  ipcMain.handle("toggle-proxy", async () => {
    console.log("Toggling proxy. Current state:", currentProxyConfig.enabled);
    currentProxyConfig.enabled = !currentProxyConfig.enabled;
    saveProxyConfig(currentProxyConfig);

    // Immediately update the webview proxy
    const result = await updateWebviewProxy(currentProxyConfig);
    return {
      ...result,
      enabled: currentProxyConfig.enabled,
    };
  });

  ipcMain.handle("test-proxy-connection", async () => {
    // Test current proxy configuration
    try {
      if (currentProxyConfig.enabled && currentProxyConfig.username && currentProxyConfig.password) {
        // Test Oxylabs connection
        const axiosConfig = {
          timeout: 15000,
          proxy: {
            protocol: currentProxyConfig.type,
            host: currentProxyConfig.host,
            port: currentProxyConfig.port,
            auth: {
              username: currentProxyConfig.username,
              password: currentProxyConfig.password,
            },
          },
        };

        await axios.get("https://ip.oxylabs.io/location", axiosConfig);
        return { success: true, message: "Proxy connection successful" };
      } else {
        return { success: false, message: "No proxy configuration found" };
      }
    } catch (error) {
      return { success: false, message: "Proxy connection failed" };
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

  // DevTools can be opened manually via the menu if needed for debugging
  // mainWindow.webContents.openDevTools();
}

// Call proxy initialization before app ready
initializeAppProxy();

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

// Clean up IPC handlers when app is quitting - Updated
app.on("before-quit", () => {
  ipcMain.removeAllListeners("clear-storage");
  ipcMain.removeAllListeners("get-network-stats");
  ipcMain.removeAllListeners("get-oxylabs-config");
  ipcMain.removeAllListeners("save-oxylabs-config");
  ipcMain.removeAllListeners("test-oxylabs-connection");
  ipcMain.removeAllListeners("get-proxy-config");
  ipcMain.removeAllListeners("set-proxy-config");
  ipcMain.removeAllListeners("toggle-proxy");
  ipcMain.removeAllListeners("test-proxy-connection");
  ipcMain.removeAllListeners("refresh-current-tab");
});
