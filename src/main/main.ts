import { app, BrowserWindow, Menu, dialog, ipcMain, session } from "electron";
import path from "path";
import fs from "fs";
import si from "systeminformation";
import axios from "axios";

// Constants
const APP_NAME = "IcogniFi";
const OXYLABS_HOST = "pr.oxylabs.io";
const OXYLABS_PORT = 7777;
const OXYLABS_API_URL = "https://ip.oxylabs.io/location";
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
  public currentProxyConfig: ProxyConfig;

  private constructor() {
    this.currentProxyConfig = this.loadProxyConfig();
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

  private loadProxyConfig(): ProxyConfig {
    const defaultConfig: ProxyConfig = {
      enabled: false,
      host: OXYLABS_HOST,
      port: OXYLABS_PORT,
      type: "http",
    };

    try {
      const configPath = this.getConfigPath("proxy-config.json");
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf8");
        return { ...defaultConfig, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error("Failed to load proxy config:", error);
    }
    return defaultConfig;
  }

  private getConfigPath(filename: string): string {
    return path.join(app.getPath("userData"), filename);
  }

  public loadOxylabsConfig(): OxylabsConfig | null {
    try {
      const configPath = this.getConfigPath("oxylabs-config.json");
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to load Oxylabs config:", error);
    }
    return null;
  }

  public saveOxylabsConfig(config: OxylabsConfig): void {
    try {
      const configPath = this.getConfigPath("oxylabs-config.json");
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log("Oxylabs config saved:", { ...config, password: "***" });
    } catch (error) {
      console.error("Failed to save Oxylabs config:", error);
      throw error;
    }
  }

  public saveProxyConfig(config: ProxyConfig): void {
    try {
      const configPath = this.getConfigPath("proxy-config.json");
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      this.currentProxyConfig = { ...config };
      console.log("Proxy config saved:", { ...config, password: config.password ? "***" : undefined });
    } catch (error) {
      console.error("Failed to save proxy config:", error);
      throw error;
    }
  }
}

// Network monitoring utilities
class NetworkMonitor {
  private state = AppState.getInstance();

  public async initialize(): Promise<void> {
    try {
      const [networkStats, networkInterfaces] = await Promise.all([si.networkStats(), si.networkInterfaces()]);

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
        console.log(`Network monitoring initialized for interface: ${primaryStats.iface}`);
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
      const [networkStats, networkInterfaces] = await Promise.all([si.networkStats(), si.networkInterfaces()]);

      const primaryInterface = this.findPrimaryInterface(networkInterfaces);
      const primaryStats = networkStats.find((stat) => stat.iface === primaryInterface?.iface) || networkStats[0];

      if (!primaryStats || !this.state.networkBaseline) {
        return defaultStats;
      }

      return this.calculateNetworkStats(primaryStats, primaryInterface);
    } catch (error) {
      console.error("Error getting network stats:", error);
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

  public buildOxylabsUsername(config: OxylabsConfig): string {
    let username = `customer-${config.customerId}-cc-${config.countryCode}`;
    if (config.sessionId?.trim()) {
      username += `-session-${config.sessionId}`;
    }
    return username;
  }

  public async updateWebviewProxy(config: ProxyConfig): Promise<ProxyTestResult> {
    console.log("Updating webview proxy with config:", { ...config, password: config.password ? "***" : undefined });

    const webviewSession = session.fromPartition("persist:webview");

    try {
      if (config.enabled && config.username && config.password) {
        return await this.enableProxy(webviewSession, config);
      } else {
        return await this.disableProxy(webviewSession);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to update webview proxy:", error);
      return { success: false, message: `Failed to update proxy: ${message}` };
    }
  }

  private async enableProxy(webviewSession: Electron.Session, config: ProxyConfig): Promise<ProxyTestResult> {
    // Clear authentication cache
    await Promise.all([webviewSession.clearAuthCache(), webviewSession.clearHostResolverCache()]);

    const proxyRules = `http=${config.host}:${config.port};https=${config.host}:${config.port}`;
    console.log("Setting webview proxy rules:", proxyRules);

    await webviewSession.setProxy({
      proxyRules,
      proxyBypassRules: "localhost,127.0.0.1,::1,<local>",
    });

    // Clear cache to ensure new credentials are used
    await webviewSession.clearCache();

    console.log(`Webview proxy enabled: ${config.host}:${config.port}`);
    return { success: true, message: `Proxy enabled: ${config.host}:${config.port}` };
  }

  private async disableProxy(webviewSession: Electron.Session): Promise<ProxyTestResult> {
    console.log("Disabling webview proxy");

    await Promise.all([webviewSession.clearAuthCache(), webviewSession.clearHostResolverCache()]);

    await webviewSession.setProxy({ proxyRules: "direct://" });

    console.log("Webview proxy disabled");
    return { success: true, message: "Proxy disabled" };
  }

  public initializeAppProxy(): void {
    const savedOxylabsConfig = this.state.loadOxylabsConfig();

    if (!savedOxylabsConfig) {
      console.log("No Oxylabs config found, no proxy set");
      return;
    }

    console.log("Initializing Oxylabs proxy at app startup...");

    const username = this.buildOxylabsUsername(savedOxylabsConfig);
    const proxyUrl = `http://${OXYLABS_HOST}:${OXYLABS_PORT}`;
    const proxyConfig = `http=${proxyUrl};https=${proxyUrl}`;

    console.log("Setting proxy via command line:", proxyConfig);
    app.commandLine.appendSwitch("proxy-server", proxyConfig);

    // Update current proxy config
    this.state.currentProxyConfig = {
      enabled: true,
      host: OXYLABS_HOST,
      port: OXYLABS_PORT,
      type: "http",
      username,
      password: savedOxylabsConfig.password,
    };

    console.log("Oxylabs proxy initialized via command line");
  }

  public async testConnection(config?: OxylabsConfig): Promise<ProxyTestResult> {
    const testConfig = config || this.state.loadOxylabsConfig();

    if (!testConfig) {
      return { success: false, message: "No proxy configuration found" };
    }

    try {
      const username = this.buildOxylabsUsername(testConfig);
      const axiosConfig = {
        timeout: CONNECTION_TIMEOUT,
        proxy: {
          protocol: "http" as const,
          host: OXYLABS_HOST,
          port: OXYLABS_PORT,
          auth: { username, password: testConfig.password },
        },
      };

      console.log("Testing connection with username:", username);

      const response = await axios.get(OXYLABS_API_URL, axiosConfig);

      if (response.status === 200 && response.data) {
        console.log("✅ Connection test successful:", response.data);
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
    console.error("💥 Connection test failed:", error);

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
          return { success: false, message: "Connection refused - unable to reach Oxylabs proxy server" };
        case "ETIMEDOUT":
          return { success: false, message: "Connection timeout - please try again" };
      }
    }

    const message = error instanceof Error ? error.message : "Unknown connection error";
    return { success: false, message };
  }
}

// Application setup
function setupAuthenticationHandler(): void {
  app.on("login", (event, _webContents, _request, authInfo, callback) => {
    console.log("🔐 [Auth Handler] Authentication requested:", {
      isProxy: authInfo.isProxy,
      host: authInfo.host,
      port: authInfo.port,
      scheme: authInfo.scheme,
      realm: authInfo.realm,
    });

    const { currentProxyConfig } = AppState.getInstance();

    if (authInfo.isProxy && currentProxyConfig.enabled && currentProxyConfig.username && currentProxyConfig.password) {
      console.log(`🔑 [Auth Handler] Providing proxy credentials for: ${authInfo.host}`);
      console.log(`👤 [Auth Handler] Using username: ${currentProxyConfig.username}`);

      const countryMatch = currentProxyConfig.username.match(/-cc-([^-]+)/);
      const country = countryMatch ? countryMatch[1] : "Unknown";
      console.log(`🌍 [Auth Handler] Country: ${country}`);

      event.preventDefault();
      callback(currentProxyConfig.username, currentProxyConfig.password);
      console.log(`✅ [Auth Handler] Credentials provided successfully`);
    } else {
      console.log("❌ [Auth Handler] No proxy credentials available or not a proxy auth request");
    }
  });
}

function setupIpcHandlers(mainWindow: BrowserWindow, networkMonitor: NetworkMonitor, proxyManager: ProxyManager): void {
  const state = AppState.getInstance();

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

  // Oxylabs configuration
  ipcMain.handle("get-oxylabs-config", () => state.loadOxylabsConfig());

  ipcMain.handle("save-oxylabs-config", async (_event, config: OxylabsConfig) => {
    console.log("Saving Oxylabs config:", { ...config, password: "***" });

    try {
      state.saveOxylabsConfig(config);

      const username = proxyManager.buildOxylabsUsername(config);
      console.log(`🔄 Building new proxy config with username: ${username}`);

      const newProxyConfig: ProxyConfig = {
        enabled: true,
        host: OXYLABS_HOST,
        port: OXYLABS_PORT,
        type: "http",
        username,
        password: config.password,
      };

      state.saveProxyConfig(newProxyConfig);
      console.log(`✅ Updated global proxy config for country: ${config.countryCode}`);

      // Small delay to ensure auth handler has updated config
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await proxyManager.updateWebviewProxy(newProxyConfig);

      if (result.success) {
        console.log(`✅ Webview proxy updated successfully for ${config.countryCode}`);
        return {
          success: true,
          message: `Successfully switched to ${config.countryCode} - Oxylabs configuration saved and proxy updated!`,
        };
      } else {
        console.error(`❌ Failed to update webview proxy:`, result.message);
        return {
          success: false,
          message: `Configuration saved but failed to update proxy: ${result.message}`,
        };
      }
    } catch (error) {
      console.error("Failed to save Oxylabs config:", error);
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Failed to save Oxylabs configuration: ${message}` };
    }
  });

  ipcMain.handle("test-oxylabs-connection", (_event, config: OxylabsConfig) => proxyManager.testConnection(config));

  // Proxy management
  ipcMain.handle("get-proxy-config", () => {
    console.log("Getting proxy config:", {
      ...state.currentProxyConfig,
      password: state.currentProxyConfig.password ? "***" : undefined,
    });
    return state.currentProxyConfig;
  });

  ipcMain.handle("set-proxy-config", async (_event, config: ProxyConfig) => {
    console.log("Setting proxy config:", { ...config, password: config.password ? "***" : undefined });
    state.saveProxyConfig(config);
    return await proxyManager.updateWebviewProxy(config);
  });

  ipcMain.handle("toggle-proxy", async () => {
    console.log("Toggling proxy. Current state:", state.currentProxyConfig.enabled);

    const newConfig = { ...state.currentProxyConfig, enabled: !state.currentProxyConfig.enabled };
    state.saveProxyConfig(newConfig);

    const result = await proxyManager.updateWebviewProxy(newConfig);
    return { ...result, enabled: newConfig.enabled };
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
    "get-oxylabs-config",
    "save-oxylabs-config",
    "test-oxylabs-connection",
    "get-proxy-config",
    "set-proxy-config",
    "toggle-proxy",
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
      webSecurity: false,
      sandbox: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
    },
  });

  // Hide menu bar completely
  Menu.setApplicationMenu(null);

  // Initialize managers
  const networkMonitor = new NetworkMonitor();
  const proxyManager = new ProxyManager();

  // Setup handlers
  setupAuthenticationHandler();
  setupIpcHandlers(mainWindow, networkMonitor, proxyManager);

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
const proxyManager = new ProxyManager();
proxyManager.initializeAppProxy();

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
