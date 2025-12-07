const NON_MODIFYING_KEYS = [
  "ShiftLeft",
  "ShiftRight",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
  "ContextMenu",
  "CapsLock",
  "Home",
  "End",
  "PageUp",
  "PageDown"
]

const tools = {
  platform: () => {
    if (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1) {
      return 'electron'
    } else {
      return 'website'
    }
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
    get_key: (key, default_value) => {
      let result = localStorage.getItem(key)
      if (result === null) {
        return default_value
      }
      return JSON.parse(result)
    },
    set_key: (key, value) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    remove_key: (key) => {
      localStorage.removeItem(key)
    },
    clear: () => {
      localStorage.clear()
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
  style: {
    get_scrollbar_width: () => {
      // by Slava Fomin II: Get scrollbar width using JavaScript

      // Creating invisible container
      const outer = document.createElement('div')
      outer.style.visibility = 'hidden'
      outer.style.overflow = 'scroll' // forcing scrollbar to appear
      outer.style.msOverflowStyle = 'scrollbar' // needed for WinJS apps
      document.body.appendChild(outer)

      // Creating inner element and placing it in the container
      const inner = document.createElement('div')
      outer.appendChild(inner)

      // Calculating difference between container's full width and the child width
      const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth)

      // Removing temporary elements from the DOM
      outer.parentNode.removeChild(outer)

      return scrollbarWidth
    }
  },
  headless: {
    assemble: (input) => {
      return new Promise((resolve, reject) => {
        let worker = new Worker(tools.headless._get_url('assembler/engine.js'))
        worker.onerror = reject
        worker.onmessage = (msg) => tools.headless._handle_msg(msg, resolve, reject)
        worker.postMessage(['assemble', input])
      })
    },
    compile: (input) => {
      return new Promise((resolve, reject) => {
        let worker = new Worker(tools.headless._get_url('compiler/engine.js'))
        worker.onerror = reject
        worker.onmessage = (msg) => tools.headless._handle_msg(msg, resolve, reject)
        worker.postMessage(['compile', input])
      })
    },
    _handle_msg: (msg, resolve, reject) => {
      let data = msg.data
      if (data[0] === 'result') {
        if (data[1] === null) {
          reject()
        } else {
          resolve(data[1])
        }
      }
    },
    _get_url: (url) => {
      // hack so that worker scripts can be loaded from top level or inside demo/ etc
      if (this.__dirname === undefined) {
        url = `../${url}`
      }
      return url
    }
  },
  text_input: {
    focus_start: (element) => {
      element.focus()
      element.setSelectionRange(0,0)
      element.scrollTop = 0
    },
    on_non_modifier_keypress: (element, callback) => {
      element.addEventListener("keyup", (event) => {
        if (!NON_MODIFYING_KEYS.includes(event.code)) {
          callback()
        }
      })
    }
  },
  base64: {
    array_to_b64: (array) => {
      let binary = ''
      for (let byte of array) {
        binary += String.fromCharCode(byte)
      }

      return window.btoa(binary)
    },
    b64_to_array: (base64) => {
      let binary_string = window.atob(base64)
      let len = binary_string.length
      let bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
      }

      return bytes
    }
  }
}
