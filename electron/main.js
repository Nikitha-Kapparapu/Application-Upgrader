const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: 'Application Upgrader',
    backgroundColor: '#0f172a',
  })

  // In development, load from Vite dev server
  win.loadURL('http://localhost:5173')

  // Open DevTools in development
  // win.webContents.openDevTools()
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
// Phase 3 — Scanner IPC
const { ipcMain } = require('electron');
const { scanProject } = require('./scanner');

ipcMain.handle('scan-project', async (event, projectPath) => {
  try {
    const result = await scanProject(projectPath);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err };
  }
});
