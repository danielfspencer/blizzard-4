var interface = {
  data: null,
  funcs: {
    input_data: null,
    child_page_loaded: () => {
      // give the page a reference to the window management tools
      window.frames[0].windows = windows
      // if we have data waiting, call the function registered by the child page with the data
      if (interface.data !== null) {
        interface.funcs.input_data(interface.data)
        interface.data = null
      }
    },
    add_button: (text, func) => {
      // the button's id is "button-(the number of buttons present)"
      let id = `button-${$("#button-container").children().length}`
      $("#button-container").append(`<div class="button" id="${id}">${text}</div>`)
      $(`#${id}`).click(func)
    }
  }
}

var theme = {
  name : null,
  element: null
}

$(document).ready(() => {
  tools.storage.get_key("starting-page", page => menu(`menu-item-${page}`), "dem")

  $(".material-design-hamburger").click(toggle_menu)

  $("#mini").click(windows.minimise)

  $("#max").click(windows.maximise)

  $("#close").click(windows.close)

  $("#about").click(() => {
    toggle_overflow_menu()
    windows.open('about/about.html', 734, 218, win => {win.windows = windows})
  })

  $("#settings").click(() => {
    toggle_overflow_menu()
    windows.open('settings/settings.html', 400, 450)
  })

  $("#dim").click(() => { //or hide when user clicks off it
    toggle_hamburger()
    toggle_menu()
  })

  $("#overflow-menu").click(toggle_overflow_menu)

  $("#overflow-close").click(toggle_overflow_menu)

  $("[id^=menu-item-]").click(function() { //report which tab user has selected
    menu(this.id)
    toggle_hamburger()
    toggle_menu()
  })

  $.getJSON("manifest.json").done((data) => {
    $("#version").html(`Version / ${data.version_name}`)
  })

  window.onkeydown = (event) => {
    if (event.which === 123 && tools.platform() === "electron") {
      electron.remote.BrowserWindow.getFocusedWindow().webContents.openDevTools()
    }
  }

  materialDesignHamburger()
})

function menu(item) {  //called when a user selects a menu item
  $("#button-container").empty()
  $("[id^=menu-item-]").removeClass("active") //un-select all options
  $("#"+item).addClass("active") // select the new one
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
	}
}

function set_theme(name) {
  theme.name = name
  $.ajax({
    url: `assets/themes/${name}.css`,
    dataType: 'text',
    success: (data) => {
      let style_tag = document.createElement('style')
      style_tag.innerHTML = data
      theme.element = style_tag
      inject_theme(document)
    }
  })
}

function inject_theme(target) {
  if (theme.element !== null) {
    target.body.appendChild(theme.element.cloneNode(true))
  }
}

function handle_msg(event) {
  interface.data = event.data.slice(1)
  menu(event.data[0])
}

function toggle_overflow_menu() {
  $("#dropdown-menu").toggleClass("active")
  $("#overflow-close").toggleClass("active")
}

function toggle_menu() {
  $("#menu").toggleClass("active")
  $("#dim").toggleClass("active")
}

window.addEventListener('message', handle_msg, false)
