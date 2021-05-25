const {app, BrowserWindow, ipcMain} = require('electron')
const context_menu = require('electron-context-menu')
const path = require('path')

let mainWindow

context_menu({
  showInspectElement: true,
  showSearchWithGoogle: false,
  showCopyImage: false,
  showLookUpSelection: false
})

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1526,
    height: 656,
    minWidth: 350,
    minHeight: 200,
    frame: false,
    icon: path.join(__dirname, 'assets/icon_512.png'),
    webPreferences: {
      nativeWindowOpen: true,
      nodeIntegration: true,
      nodeIntegrationInWorker: false
    }
  })
  mainWindow.loadFile('index.html')
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // centre any popup windows
  mainWindow.webContents.on('new-window', centre_window)
})

function centre_window(event, url, frameName, disposition, options) {
  event.preventDefault()
  options.x = undefined
  options.y = undefined
  options.useContentSize = true
  event.newGuest = new BrowserWindow(options)
  event.newGuest.webContents.on('new-window', centre_window)
}

ipcMain.on('window-management', (event, arg) => {
  switch (arg) {
    case 'maximise':
      if (mainWindow.isMaximized()) {
        mainWindow.restore()
      } else {
        mainWindow.maximize()
      }
      break
    case 'minimise':
      mainWindow.minimize()
      break
    default:
      console.console.warn(`Unknown command ${arg}`);
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
