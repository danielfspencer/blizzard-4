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
      if (tools.platform() ==='chrome_app') {
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
      if (tools.platform() ==='chrome_app') {
        let obj = {}
        obj[key] = value
        chrome.storage.local.set(obj)
      } else {
        localStorage.setItem(key, JSON.stringify(value))
      }
    },
    clear: () => {
      if (tools.platform() ==='chrome_app') {
        chrome.storage.local.clear()
      } else {
        localStorage.clear()
      }
    }
  },
  pages: {
    switch: (target, data) => {
      if (data) {
        parent.postMessage([target, data], '*')
      } else {
        parent.postMessage([target, null], '*')
      }
    }
  },
  headless: {
    assemble: (input) => {
      return new Promise((resolve, reject) => {
        let worker = new Worker('../assembler/engine.js')
        worker.onerror = () => reject(input)
        worker.onmessage = (msg) => tools.headless.handle_msg(msg, resolve, worker.onerror)
        worker.postMessage(['assemble', input])
      })
    },
    compile: (input) => {
      return new Promise((resolve, reject) => {
        let worker = new Worker('../compiler/engine.js')
        worker.onerror = () => reject(input)
        worker.onmessage = (msg) => tools.headless.handle_msg(msg, resolve, worker.onerror)
        worker.postMessage(['compile', input])
      })
    },
    handle_msg: (msg, resolve, reject) => {
      let data = msg.data
      if (data[0] === 'result') {
        if (data[1] === null) {
          reject()
        } else {
          resolve(data[1])
        }
      }
    }
  }
}
