const { contextBridge, ipcRenderer } = require('electron')

// Expose safe APIs to React frontend
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  scanProject: (path) => ipcRenderer.invoke('scan-project', path),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args))
    
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})