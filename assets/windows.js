const windows = {
  open: (url, width, height, callback) => {
    switch (tools.platform()) {
      case "chrome_app": {
        chrome.app.window.create(url, {
          frame: "none",
          resizable: false,
          bounds: { width: width, height: height }
        }, (ref) => { callback(ref.contentWindow) })
        } break
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
      case "chrome_app":
        chrome.app.window.current().minimize()
        break
      case "electron":
        electron.remote.BrowserWindow.getFocusedWindow().minimize()
        break
      default:
        console.warn('Not supported')
        return
    }
  },
  maximise: () => {
    let page
    switch (tools.platform()) {
      case "chrome_app":
        page = chrome.app.window.current()
        break
      case "electron":
        page = electron.remote.BrowserWindow.getFocusedWindow()
        break
      default:
        console.warn('Not supported')
        return
    }

    if (page.isMaximized()) {
      page.restore()
    } else {
      page.maximize()
    }
  }
}

// provides 'electron' variable which references the electron process, if it exists
if (tools.platform() === "electron") {
  window.$ = window.jQuery = module.exports; // avoid breaking jquery with electron's node integration
  electron = require('electron')
}
