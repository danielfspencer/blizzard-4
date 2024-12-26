const fs = require('fs')
const path = require('path')
const program = require('commander')
const {app, BrowserWindow, ipcMain} = require('electron')
const context_menu = require('electron-context-menu')

const { version } = require('./package.json')

function fail(message) {
  console.error(message)
  process.exit(1)
}

function read_file(path) {
  let file
  try {
    // stdin is file 0
    if (path === '-') {
      path = 0
    }
    file = fs.readFileSync(path).toString()
  } catch (error) {
    fail(`Unable to read file\n${error.message}`)
  }
  return file
}

function parse_freq(value) {
  let freq = parseInt(value)
  if (freq < 100) {
    fail("Freq must be >=100Hz")
  }
  return freq
}

program
  .version(`v${version}`)
  .arguments('<input_file>')
  .option('--freq <number>', 'emulator frequency, integer kHz', parse_freq)
  .option('--no-autostart', 'don\'t automatically start emulator')
  .option('--fullscreen', 'make emulator display fullscreen')
  .parse(process.argv)

let queued_message
let input_path = program.args[0]

if (input_path !== undefined) {
  queued_message = {
    file: read_file(input_path),
    freq: program.freq,
    autostart: program.autostart
  }
}

let mainWindow

context_menu({
  showInspectElement: true,
  showSearchWithGoogle: false,
  showCopyImage: false,
  showLookUpSelection: false
})

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1550,
    height: 656,
    minWidth: 350,
    minHeight: 200,
    frame: false,
    show: false,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nativeWindowOpen: true,
      nodeIntegration: true,
      nodeIntegrationInWorker: false
    }
  })

  mainWindow
    .loadFile('index.html')
    .then(() => {
      if (queued_message) {
        mainWindow.webContents.send('run-file', queued_message)
      }
    })


  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

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
    case 'emulator_ready':
      if (program.fullscreen) {
        // must be called from main thread (in renderer process, only a user initiated button press can go fullscreen)
        mainWindow.webContents.executeJavaScript("window.frames[0].go_fullscreen()", true)
      }
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
