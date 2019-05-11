const {app, BrowserWindow} = require('electron')
let mainWindow

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1526,
    height: 656,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: false
    }
  })
  mainWindow.loadFile('index.html')
  mainWindow.on('closed', () => {
    mainWindow = null
  })
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
