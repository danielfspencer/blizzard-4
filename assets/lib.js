// this file contains a series of evil hacks that aim to provide a consistent interface for common
// localStorage, file and window operations across electron apps, chrome apps and normal websites

// provides 'electron' variable which references the electron process, if it exists
if (get_platform() == "electron") {
  window.$ = window.jQuery = module.exports; // avoid breaking jquery with node integration
  electron = require('electron').remote
}

// provides 'get_platform()' to find out what we are running under
function get_platform() {
  try {
    var ref = chrome.storage.local
  } catch (e) {}

  if (typeof ref !== 'undefined') {
    return 'chrome_app'
  }

  if (typeof require !== 'undefined') {
    return 'electron'
  }

  return 'website'
}

// files:
//       - open(event, callback)
//         given a file picker event, call the callback with the content of the file
// storage:
//       - get_key(key, callback, default)
//         call callback with the value of the key, or default if the key is not set
//       - set_key(key,valie)
//         set the key to have the given value
//       - clear()
//         unset all keys
const tools = {
  files: {
    load: (event, callback) => {
      let file = event.target.files[0]
      if (!file) {
        return
      }

      let reader = new FileReader()
      reader.fileName = file.name
      reader.onload = (event) => {
        callback(event.target.result)
      }
      reader.readAsText(file)
    }
  },
  storage: {
    get_key: (key, callback, default_value) => {
      if (get_platform() == 'chrome_app') {
        chrome.storage.local.get([key], (items) => {
          let result = items[key]
          if (result === undefined) {
            callback(default_value)
          } else {
            callback(result)
          }
        })
      } else {
        let result = localStorage.getItem(key)
        if (result == null) {
          callback(default_value)
        } else {
          try {
            callback(JSON.parse(result))
          } catch (e) {
            callback(result)
          }
        }
      }
    },
    set_key: (key, value) => {
      if (get_platform() == 'chrome_app') {
        let obj = {}
        obj[key] = value
        chrome.storage.local.set(obj)
      } else {
        localStorage.setItem(key, JSON.stringify(value))
      }
    },
    clear: () => {
      if (get_platform() == 'chrome_app') {
        chrome.storage.local.clear()
      } else {
        localStorage.clear()
      }
    }
  },
  windows: {
    open: (url, title, width, height, callback) => {
      switch (get_platform()) {
        case "chrome_app": {
          // this is a hack because chrome does not take into account the
          // path of the script that is calling the windows.open function
          let calle_path = window.location.pathname.split('/')
          if (!calle_path[1].endsWith('.html')) {
            url = `${calle_path[1]}/${url}`
          }
          chrome.app.window.create(url, {
            frame: "none",
            resizable: false,
            bounds: { width: width, height: height }
          }, (ref) => { callback(ref.contentWindow) })
          } break
        default: {
          callback(window.open(url, title, `height=${height},width=${width}`))
          } break
      }
    },
    close: () => { window.close() },
    minimise: () => {
      switch (get_platform()) {
        case "chrome_app":
          chrome.app.window.current().minimize()
          break
        case "electron":
          electron.BrowserWindow.getFocusedWindow().minimize()
          break
        default:
          console.warn('Not supported')
          return
      }
    },
    maximise: () => {
      let page
      switch (get_platform()) {
        case "chrome_app":
          page = chrome.app.window.current()
          break
        case "electron":
          page = electron.BrowserWindow.getFocusedWindow()
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
}
