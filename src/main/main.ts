import { app, BrowserWindow, Menu, dialog, ipcMain, session } from "electron";
import path from "path";
import fs from "fs";
import si from "systeminformation";
import axios from "axios";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

// Debug: Check if environment variables are loaded
console.log("Environment variables loaded:", {
  hasCustomerId: !!process.env.OXYLABS_CUSTOMER_ID,
  hasPassword: !!process.env.OXYLABS_PASSWORD,
  nodeEnv: process.env.NODE_ENV,
});

// Constants
const APP_NAME = "IncogniFi";
const CONNECTION_TIMEOUT = 15000;
const WINDOW_CONFIG = {
  width: 1200,
  height: 800,
  defaultTrafficLightPosition: { x: 20, y: 20 },
} as const;

// Set the app name
app.name = APP_NAME;

// Types
interface NetworkBaseline {
  rx_bytes: number;
  tx_bytes: number;
  interfaceName: string;
}

interface NetworkStats {
  rx_bytes: number;
  tx_bytes: number;
  timestamp: number;
}

interface NetworkStatistics {
  downloadSpeed: number;
  uploadSpeed: number;
  totalDownload: number;
  totalUpload: number;
  sessionDuration: number;
  isConnected: boolean;
}

interface ProxyServer {
  endpoint: string;
  port: number;
  countryCode: string;
}

interface ProxyTestResult {
  success: boolean;
  message: string;
  ip?: string;
  location?: string;
}

// State management
class AppState {
  private static instance: AppState;

  public networkBaseline: NetworkBaseline | null = null;
  public lastNetworkStats: NetworkStats | null = null;
  public sessionStartTime: number = 0;
  public currentProxyServer: ProxyServer | null = null;

  private constructor() {}

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }
}

// Network monitoring utilities
class NetworkMonitor {
  private state = AppState.getInstance();
  private interfaceCache: any = null;
  private lastInterfaceUpdate = 0;
  private readonly INTERFACE_CACHE_DURATION = 30000; // Cache interfaces for 30 seconds

  public async initialize(): Promise<void> {
    try {
      const [networkStats, networkInterfaces] = await Promise.all([si.networkStats(), si.networkInterfaces()]);

      // Cache the network interfaces
      this.interfaceCache = networkInterfaces;
      this.lastInterfaceUpdate = Date.now();

      const primaryInterface = this.findPrimaryInterface(networkInterfaces);
      const primaryStats = networkStats.find((stat) => stat.iface === primaryInterface?.iface) || networkStats[0];

      if (primaryStats) {
        this.state.networkBaseline = {
          rx_bytes: primaryStats.rx_bytes,
          tx_bytes: primaryStats.tx_bytes,
          interfaceName: primaryStats.iface,
        };

        this.state.lastNetworkStats = {
          rx_bytes: primaryStats.rx_bytes,
          tx_bytes: primaryStats.tx_bytes,
          timestamp: Date.now(),
        };

        this.state.sessionStartTime = Date.now();
      }
    } catch (error) {
      console.error("Failed to initialize network monitoring:", error);
    }
  }

  private findPrimaryInterface(interfaces: any[]): any {
    return (
      interfaces.find((iface) => iface.default || iface.ip4) ||
      interfaces.find((iface) => !iface.internal && iface.ip4) ||
      interfaces[0]
    );
  }

  public async getStats(): Promise<NetworkStatistics> {
    const defaultStats: NetworkStatistics = {
      downloadSpeed: 0,
      uploadSpeed: 0,
      totalDownload: 0,
      totalUpload: 0,
      sessionDuration: 0,
      isConnected: false,
    };

    try {
      // Only get network interfaces if cache is stale or missing
      let networkInterfaces = this.interfaceCache;
      const now = Date.now();

      if (!networkInterfaces || now - this.lastInterfaceUpdate > this.INTERFACE_CACHE_DURATION) {
        // Cache is stale, refresh it
        [networkInterfaces] = await Promise.all([si.networkInterfaces()]);
        this.interfaceCache = networkInterfaces;
        this.lastInterfaceUpdate = now;
      }

      // Always get fresh network stats (these are lightweight and change frequently)
      const [networkStats] = await Promise.all([si.networkStats()]);

      const primaryInterface = this.findPrimaryInterface(networkInterfaces);
      const primaryStats = networkStats.find((stat) => stat.iface === primaryInterface?.iface) || networkStats[0];

      if (!primaryStats || !this.state.networkBaseline) {
        return defaultStats;
      }

      return this.calculateNetworkStats(primaryStats, primaryInterface);
    } catch (error) {
      return defaultStats;
    }
  }

  private calculateNetworkStats(primaryStats: any, primaryInterface: any): NetworkStatistics {
    const { networkBaseline, lastNetworkStats, sessionStartTime } = this.state;

    if (!networkBaseline) {
      return {
        downloadSpeed: 0,
        uploadSpeed: 0,
        totalDownload: 0,
        totalUpload: 0,
        sessionDuration: 0,
        isConnected: false,
      };
    }

    // Calculate session totals
    const sessionDownload = Math.max(0, primaryStats.rx_bytes - networkBaseline.rx_bytes);
    const sessionUpload = Math.max(0, primaryStats.tx_bytes - networkBaseline.tx_bytes);

    // Calculate speeds
    let downloadSpeed = 0;
    let uploadSpeed = 0;

    if (lastNetworkStats && primaryStats.ms > 0) {
      const timeDiff = primaryStats.ms / 1000;
      downloadSpeed = Math.max(0, (primaryStats.rx_bytes - lastNetworkStats.rx_bytes) / timeDiff);
      uploadSpeed = Math.max(0, (primaryStats.tx_bytes - lastNetworkStats.tx_bytes) / timeDiff);
    }

    // Update last stats
    this.state.lastNetworkStats = {
      rx_bytes: primaryStats.rx_bytes,
      tx_bytes: primaryStats.tx_bytes,
      timestamp: Date.now(),
    };

    return {
      downloadSpeed,
      uploadSpeed,
      totalDownload: sessionDownload,
      totalUpload: sessionUpload,
      sessionDuration: Math.floor((Date.now() - sessionStartTime) / 1000),
      isConnected: !!primaryInterface?.ip4,
    };
  }
}

// Proxy management utilities
class ProxyManager {
  private state = AppState.getInstance();

  private getCredentials() {
    const customerId = "***REMOVED***";
    const password = "***REMOVED***";

    if (!customerId || !password) {
      const error = `Missing environment variables: ${!customerId ? "OXYLABS_CUSTOMER_ID" : ""} ${
        !password ? "OXYLABS_PASSWORD" : ""
      }`;
      console.error(error);
      throw new Error(error);
    }

    return { customerId, password };
  }

  private buildUsername(countryCode: string): string {
    const { customerId } = this.getCredentials();
    return `customer-${customerId}-cc-${countryCode}`;
  }

  public async setProxy(server: ProxyServer): Promise<ProxyTestResult> {
    console.log("Setting proxy server:", {
      endpoint: server.endpoint,
      port: server.port,
      countryCode: server.countryCode,
    });
    const webviewSession = session.fromPartition("persist:webview");

    try {
      const { password } = this.getCredentials();
      const username = this.buildUsername(server.countryCode);

      // Clear authentication and resolver caches
      await Promise.all([
        webviewSession.clearAuthCache(),
        webviewSession.clearHostResolverCache(),
        // Don't clear any storage data to preserve Cloudflare cookies
      ]);

      const proxyRules = `http=${server.endpoint}:${server.port};https=${server.endpoint}:${server.port}`;

      await webviewSession.setProxy({
        proxyRules,
        proxyBypassRules: "localhost,127.0.0.1,::1,<local>",
      });

      // Set up authentication
      app.removeAllListeners("login");
      app.on("login", (event, _webContents, _request, authInfo, callback) => {
        if (authInfo.isProxy) {
          event.preventDefault();
          callback(username, password);
        }
      });

      this.state.currentProxyServer = server;

      console.log("Proxy set successfully");
      return {
        success: true,
        message: `Proxy enabled: ${server.endpoint}:${server.port} (${server.countryCode})`,
      };
    } catch (error) {
      console.error("Failed to set proxy:", error);
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to set proxy: ${message}` };
    }
  }

  public async disableProxy(): Promise<ProxyTestResult> {
    const webviewSession = session.fromPartition("persist:webview");

    try {
      await Promise.all([
        webviewSession.clearAuthCache(),
        webviewSession.clearHostResolverCache(),
        webviewSession.clearCache(),
      ]);

      await webviewSession.setProxy({ proxyRules: "direct://" });

      // Remove auth handler
      app.removeAllListeners("login");

      this.state.currentProxyServer = null;

      return { success: true, message: "Proxy disabled" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to disable proxy: ${message}` };
    }
  }

  public async testConnection(server?: ProxyServer): Promise<ProxyTestResult> {
    const testServer = server || this.state.currentProxyServer;

    if (!testServer) {
      return { success: false, message: "No proxy server configured" };
    }

    try {
      const { password } = this.getCredentials();
      const username = this.buildUsername(testServer.countryCode);

      const axiosConfig = {
        timeout: CONNECTION_TIMEOUT,
        proxy: {
          protocol: "http" as const,
          host: testServer.endpoint,
          port: testServer.port,
          auth: { username, password },
        },
      };

      const response = await axios.get("https://ip.oxylabs.io/location", axiosConfig);

      if (response.status === 200 && response.data) {
        return {
          success: true,
          ip: response.data.ip || "Unknown",
          location: response.data.country || response.data.location || "Unknown",
          message: "Connection successful!",
        };
      }

      return { success: false, message: "Unexpected response from Oxylabs" };
    } catch (error) {
      return this.handleConnectionError(error);
    }
  }

  private handleConnectionError(error: unknown): ProxyTestResult {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const code = error.code;

      switch (status) {
        case 407:
          return { success: false, message: "Authentication failed - please check your credentials" };
        case 403:
          return { success: false, message: "Access forbidden - please check your account permissions" };
      }

      switch (code) {
        case "ECONNREFUSED":
          return { success: false, message: "Connection refused - unable to reach proxy server" };
        case "ETIMEDOUT":
          return { success: false, message: "Connection timeout - please try again" };
      }
    }

    const message = error instanceof Error ? error.message : "Unknown connection error";
    return { success: false, message };
  }
}

// Application setup
function setupIpcHandlers(mainWindow: BrowserWindow, networkMonitor: NetworkMonitor, proxyManager: ProxyManager): void {
  // Storage management
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
      mainWindow.webContents.session.clearStorageData();
      mainWindow.webContents.reload();
      return { success: true };
    }
    return { success: false };
  });

  // Network monitoring
  ipcMain.handle("get-network-stats", () => networkMonitor.getStats());

  // Proxy management
  ipcMain.handle("set-proxy-server", async (_event, server: ProxyServer) => {
    console.log("IPC: set-proxy-server called with:", server);
    try {
      const result = await proxyManager.setProxy(server);
      console.log("IPC: set-proxy-server result:", result);
      return result;
    } catch (error) {
      console.error("IPC: set-proxy-server error:", error);
      return { success: false, message: `IPC error: ${error}` };
    }
  });

  ipcMain.handle("disable-proxy", async () => {
    return await proxyManager.disableProxy();
  });

  ipcMain.handle("test-proxy-connection", () => proxyManager.testConnection());

  // Tab management
  ipcMain.handle("refresh-current-tab", async () => {
    try {
      mainWindow.webContents.send("refresh-current-tab");
      return { success: true };
    } catch (error) {
      console.error("Failed to refresh current tab:", error);
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  });
}

function cleanupIpcHandlers(): void {
  const handlers = [
    "clear-storage",
    "get-network-stats",
    "set-proxy-server",
    "disable-proxy",
    "test-proxy-connection",
    "refresh-current-tab",
  ];

  handlers.forEach((handler) => ipcMain.removeAllListeners(handler));
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.width,
    height: WINDOW_CONFIG.height,
    title: APP_NAME,
    icon: path.join(__dirname, "../renderer/assets/icognifi-alpha.png"),
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: WINDOW_CONFIG.defaultTrafficLightPosition,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: true,
      sandbox: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      spellcheck: true,
      session: undefined,
    },
  });

  // Hide menu bar completely
  Menu.setApplicationMenu(null);

  // Configure webview session for better Cloudflare compatibility
  const webviewSession = session.fromPartition("persist:webview");

  // Set a current Chrome user agent for all webview requests
  const userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";
  webviewSession.setUserAgent(userAgent);

  // Handle permission requests for Private Access Tokens
  webviewSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow all permissions for Cloudflare to work properly
    console.log(`Permission requested: ${permission} from ${webContents.getURL()}`);
    callback(true);
  });

  // Enable features needed for Cloudflare challenges
  webviewSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    // Ensure proper headers for Cloudflare
    headers["Accept"] =
      headers["Accept"] || "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8";
    headers["Accept-Language"] = headers["Accept-Language"] || "en-US,en;q=0.5";
    callback({ requestHeaders: headers });
  });

  // Initialize managers
  const networkMonitor = new NetworkMonitor();
  const proxyManager = new ProxyManager();

  // Setup handlers
  setupIpcHandlers(mainWindow, networkMonitor, proxyManager);

  // Set Content Security Policy for the main window
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;",
        ],
      },
    });
  });

  // Window event handlers
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    console.log("Window is ready to show");
  });

  const errorHandlers = {
    crashed: () => console.error("Renderer process crashed"),
    unresponsive: () => console.error("Renderer process became unresponsive"),
    "did-fail-load": (_event: any, errorCode: number, errorDescription: string, validatedURL: string) => {
      console.error("Failed to load main window:", { errorCode, errorDescription, validatedURL });
    },
  };

  Object.entries(errorHandlers).forEach(([event, handler]) => {
    mainWindow.webContents.on(event as any, handler);
  });

  // Load content
  loadApplicationContent(mainWindow);

  return mainWindow;
}

function loadApplicationContent(mainWindow: BrowserWindow): void {
  const isDevelopment = process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "true";
  const isPackaged = app.isPackaged;

  if (isDevelopment && !isPackaged) {
    console.log("Development mode detected, attempting to load dev server...");
    try {
      mainWindow.loadURL("http://localhost:5173");
    } catch (error) {
      console.log("Dev server not available, falling back to production files");
      loadProductionFiles(mainWindow);
    }
  } else {
    console.log("Production mode detected, loading built files...");
    loadProductionFiles(mainWindow);
  }
}

function loadProductionFiles(mainWindow: BrowserWindow): void {
  const htmlPath = path.join(__dirname, "..", "renderer", "index.html");
  console.log("Loading production file from:", htmlPath);

  if (fs.existsSync(htmlPath)) {
    mainWindow.loadFile(htmlPath);
    return;
  }

  // Fallback path resolution
  const fallbackPath = path.resolve(process.cwd(), "dist", "renderer", "index.html");
  console.log("Trying fallback path:", fallbackPath);

  if (fs.existsSync(fallbackPath)) {
    mainWindow.loadFile(fallbackPath);
    return;
  }

  // Load error page if no files found
  console.error("Could not find index.html file in either location");
  loadErrorPage(mainWindow, htmlPath, fallbackPath);
}

function loadErrorPage(mainWindow: BrowserWindow, htmlPath: string, fallbackPath: string): void {
  const errorHtml = `
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
          <li>isPackaged: ${app.isPackaged}</li>
          <li>__dirname: ${__dirname}</li>
          <li>process.cwd(): ${process.cwd()}</li>
        </ul>
      </body>
    </html>
  `;

  mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`);
}

// Application lifecycle
app.whenReady().then(async () => {
  createWindow();
  const networkMonitor = new NetworkMonitor();
  await networkMonitor.initialize();

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

app.on("before-quit", cleanupIpcHandlers);
