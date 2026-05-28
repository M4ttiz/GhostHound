const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ghostHoundAPI", {
  checkUsername: (username) => ipcRenderer.invoke("osint:checkUsername", username),
  investigateDomain: (target) => ipcRenderer.invoke("osint:investigateDomain", target),
  searchBreach: (email) => ipcRenderer.invoke("osint:searchBreach", email),
  extractEXIF: (imagePath) => ipcRenderer.invoke("osint:extractEXIF", imagePath),
  selectFile: () => ipcRenderer.invoke("osint:selectFile"),
  exportJSON: (data, filename) => ipcRenderer.invoke("osint:exportJSON", { data, filename }),
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close")
});
