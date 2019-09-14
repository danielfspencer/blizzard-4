if (get_platform() == "electron") {
  window.$ = window.jQuery = module.exports; // avoid breaking jquery with node integration
  remote = require('electron').remote
}

function menu(item) {  //called when a user selects a menu item
  $( "[id^=menu-item-]").removeClass("active") //un-select all options
  $( "#"+item ).addClass("active") // select the new one
  switch(item.slice(-3)) { //change title and content accordingly
  	case "asm":
      $("#toolbar-title").html("Assembler")
      $("#content").attr("src","assembler/assembler.html")
      break
  	case "cmp":
      $("#toolbar-title").html("Compiler")
      $("#content").attr("src","compiler/compiler.html")
      break
  	case "emu":
      $("#toolbar-title").html("Emulator")
      $("#content").attr("src","emulator/emulator.html")
      break
  	case "man":
      $("#toolbar-title").html("Manual")
      $("#content").attr("src","manual/manual.html")
      break
    case "dem":
      $("#toolbar-title").html("Demo Programs")
      $("#content").attr("src","demo/demo.html")
      break
    default:
      break
	}
}

function set_theme(theme) {
  current_theme.name = theme

  var path = "assets/themes/" + theme + "_frame.css"
  inject_stylesheet(path, document)

  $.ajax({
    url: "assets/themes/"+ theme + "_content.css",
    dataType: "text",
    success: (content) => {
      current_theme.content = create_css_element(content)
    }
  })
}

function create_css_element(content) {
  var elem = document.createElement("style")
  elem.type = "text/css"
  elem.innerHTML = content
  return elem
}

function inject_stylesheet(path, target) {
  var stylesheet = document.createElement("link")
  stylesheet.href = path
  stylesheet.rel = "stylesheet"
  stylesheet.type = "text/css"
  target.body.appendChild(stylesheet)
}

function child_set_theme(target) {
  if (current_theme.content != null) {
    target.body.appendChild(current_theme.content)
  }
}

function child_page_loaded() {
 if (input_data_waiting) {
  input_data(data)
  input_data_waiting = false
 }
}

function handleMsg(event) {
  data = event.data.slice(1)
  input_data_waiting = true
  menu(event.data[0])
}

function toggle_overflow_menu() {
  $( "#dropdown-menu" ).toggleClass("active")
  $( "#overflow-close" ).toggleClass("active")
}

function toggle_menu() {
  $( "#menu" ).toggleClass("active")
  $( "#dim" ).toggleClass("active")
}

var input_data_waiting = false
var current_theme = {
  "name" : null,
  "content" : null
}

$( document ).ready( () => { //connect all the butons to their actions!
  storage_get_key("starting-page", (page) => (menu("menu-item-"+page)), "dem")
  materialDesignHamburger()

  $( ".material-design-hamburger" ).click( () => { //show or hide menu on button press
    toggle_menu()
  })

  $( "#close" ).click( () => {
    window.close()
  })

  $( "#mini" ).click( () => {
    switch (get_platform()) {
      case "chrome_app":
        chrome.app.window.current().minimize()
        break
      case "electron":
        remote.BrowserWindow.getFocusedWindow().minimize()
        break
    }
  })

  $( "#max" ).click( () => {
    switch (get_platform()) {
      case "chrome_app":
        var page = chrome.app.window.current()
        break
      case "electron":
        var page = remote.BrowserWindow.getFocusedWindow()
        break
    }

    if (page.isMaximized()) {
      page.restore()
    } else {
      page.maximize()
    }

  })

  $( "#about" ).click( () => {
    toggle_overflow_menu()
    if (get_platform() == "chrome_app") {
      chrome.app.window.create('about/about.html', {
        "frame": "none",
        "resizable": false,
        "bounds": {
          width: 734,
          height: 218
        }
      })
    } else {
      window.open("about/about.html",'About','height=218,width=734')
    }
  })

  $( "#settings" ).click( () => {
    toggle_overflow_menu()
    if (get_platform() == "chrome_app") {
      chrome.app.window.create('settings/settings.html', {
        "frame": "none",
        "resizable": false,
        "bounds": {
          width: 400,
          height: 500
        }
      })
    } else {
      window.open("settings/settings.html",'Settings','height=500,width=400')
    }
  })

  $( "#dim" ).click( () => { //or hide when user clicks off it
    toggle_hamburger()
    toggle_menu()
  })

  $( "#overflow-menu" ).click( () => {
    toggle_overflow_menu()
  })

  $("#overflow-close").click( () => {
    toggle_overflow_menu()
  })

  $( "[id^=menu-item-]").click(function() { //report which tab user has selected
		menu(this.id)
    toggle_hamburger()
    toggle_menu()
	})

  $.getJSON("manifest.json").done( (data) => {
    $("#version").html("Version / " + data["version_name"])
  })

  window.onkeydown = (event) => {
    if (event.which === 123 && get_platform() === "electron") {
      remote.BrowserWindow.getFocusedWindow().webContents.openDevTools()
    }
  }

})

window.addEventListener('message', handleMsg, false)
