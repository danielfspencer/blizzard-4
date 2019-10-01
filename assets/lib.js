// platform(): returns one of "website/chrome_app/electron"
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
  platform: () => {
    try {
      var ref = chrome.storage.local
      return 'chrome_app'
    } catch (e) {}

    if (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1) {
      return 'electron'
    }

    return 'website'
  },
  files: {
    load: (event, callback) => {
      const file = event.target.files[0]
      if (!file) {
        return
      }

      const reader = new FileReader()
      reader.fileName = file.name
      reader.onload = (event) => {
        callback(event.target.result)
      }
      reader.readAsText(file)
    }
  },
  storage: {
    get_key: (key, callback, default_value) => {
      if (tools.platform() === 'chrome_app') {
        chrome.storage.local.get([key], (items) => {
          const result = items[key]
          if (result === undefined) {
            callback(default_value)
          } else {
            callback(result)
          }
        })
      } else {
        const result = localStorage.getItem(key)
        if (result === null) {
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
      if (tools.platform() === 'chrome_app') {
        const obj = {}
        obj[key] = value
        chrome.storage.local.set(obj)
      } else {
        localStorage.setItem(key, JSON.stringify(value))
      }
    },
    clear: () => {
      if (tools.platform() === 'chrome_app') {
        chrome.storage.local.clear()
      } else {
        localStorage.clear()
      }
    }
  }
}
