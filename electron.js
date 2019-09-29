const {app, BrowserWindow} = require('electron')
let mainWindow

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1526,
    height: 656,
    frame: false,
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
