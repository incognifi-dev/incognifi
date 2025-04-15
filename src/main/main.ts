import { app, BrowserWindow, Menu, dialog } from "electron";
import path from "path";

// Set the app name
app.name = "IcogniFi";

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
              {
                label: "Clear Storage and Reset",
                click: async () => {
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
                  }
                },
              },
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
      submenu: [
        isMac ? { role: "close" } : { role: "quit" },
        {
          label: "Clear Storage and Reset",
          click: async () => {
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
            }
          },
        },
      ],
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
