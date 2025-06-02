import { app, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import path from "path";
import si from "systeminformation";

// Set the app name
app.name = "IcogniFi";

// Network monitoring state
let networkBaseline: any = null;
let lastNetworkStats: any = null;
let sessionStartTime: number = 0;

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

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "IcogniFi",
    icon: path.join(__dirname, "../renderer/assets/icognifi-alpha.png"),
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 20 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: true,
      sandbox: false,
    },
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

  // Create the application menu
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [isMac ? { role: "close" } : { role: "quit" }],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [{ type: "separator" }, { role: "front" }, { type: "separator" }, { role: "window" }]
          : [{ role: "close" }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);

  // In development, load from the Vite dev server
  if (process.env.NODE_ENV !== "production") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.resolve(__dirname, "..", "renderer", "index.html"));
  }
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
});
