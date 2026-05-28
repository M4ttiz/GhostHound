const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const path = require("path");
const fs = require("fs");
const stealth = require("./src/modules/stealth");
const osint = require("./src/modules/osint-core");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1250,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    frame: false, // Frameless design for modern SOC dashboard look
    backgroundColor: "#0d1117",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Load index.html
  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

  // Initialize Stealth Module on window session
  try {
    stealth.initStealth(mainWindow.webContents.session);
    console.log("Stealth system operational: User-Agent rotation and WebRTC leak block configured.");
  } catch (err) {
    console.error("Failed to initialize Stealth system:", err);
  }

  // Handle window close
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Electron ready hook
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * ----------------------------------------------------
 * SECURE IPC CHANNELS
 * ----------------------------------------------------
 */

// 1. Sherlock username search
ipcMain.handle("osint:checkUsername", async (event, username) => {
  try {
    return await osint.checkUsername(username);
  } catch (err) {
    return { error: err.message };
  }
});

// 2. Domain and IP investigation
ipcMain.handle("osint:investigateDomain", async (event, target) => {
  try {
    return await osint.investigateDomain(target);
  } catch (err) {
    return { error: err.message };
  }
});

// 3. Breach scanning
ipcMain.handle("osint:searchBreach", async (event, email) => {
  try {
    return await osint.searchBreach(email);
  } catch (err) {
    return { error: err.message };
  }
});

// 4. Local Image EXIF parser
ipcMain.handle("osint:extractEXIF", async (event, imagePath) => {
  try {
    return osint.extractEXIF(imagePath);
  } catch (err) {
    return { error: err.message };
  }
});

// 5. Open Native File Dialog for EXIF images
ipcMain.handle("osint:selectFile", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select EXIF Image target",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["jpg", "jpeg", "png"] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// 6. Secure Export JSON to Local Disk
ipcMain.handle("osint:exportJSON", async (event, { data, filename }) => {
  if (!mainWindow) return { success: false, error: "No window context" };

  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Export OSINT Data as JSON",
    defaultPath: path.join(app.getPath("downloads"), filename || "osint_export.json"),
    filters: [
      { name: "JSON files", extensions: ["json"] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { success: false, error: "Export canceled" };
  }

  try {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), "utf-8");
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 7. Window management handles for custom Title Bar
ipcMain.on("window:minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window:maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window:close", () => {
  if (mainWindow) mainWindow.close();
});
