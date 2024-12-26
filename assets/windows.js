// avoid breaking jquery with electron's node integration
if (tools.platform() === "electron") {
  window.$ = window.jQuery = module.exports;
  electron = require('electron')
}

const windows = {
  open: (url, width, height, callback) => {
    if (callback === undefined) {
      callback = () => {}
    }
    switch (tools.platform()) {
      case "electron": {
        callback(window.open(`${__dirname}/${url}`, url, `height=${height},width=${width}`))
        } break
      default: {
        let calle_path = window.location.pathname.split('/')
        calle_path.pop()
        calle_path.push(url)
        url = calle_path.join("/")
        callback(window.open(url, url, `height=${height},width=${width}`))
        } break
    }
  },
  open_external: (url) => {
    switch (tools.platform()) {
      case "electron": {
        electron.shell.openExternal(url)
        } break
      default: {
        window.open(url)
        } break
      }
  },
  close: () => { window.close() },
  minimise: () => {
    switch (tools.platform()) {
      case "electron":
        electron.ipcRenderer.send('window-management','minimise')
        break
      default:
        console.warn('Not supported')
        return
    }
  },
  maximise: () => {
    switch (tools.platform()) {
      case "electron":
        electron.ipcRenderer.send('window-management','maximise')
        break
      default:
        console.warn('Not supported')
        return
    }
  },
  emulator_ready: () => {
    if (tools.platform() == "electron") {
      electron.ipcRenderer.send('window-management','emulator_ready')
    }
  }
}
