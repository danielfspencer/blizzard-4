const DEFAULT_PAGE = "demo"

var interface = {
  message: null,
  child_page_loaded: (message_handler) => {
    // remove all the existing buttons
    $("#button-container").empty()

    // give the page a reference to the window management tools
    let child = window.frames[0]
    child.windows = windows

    // if we have a message waiting, call the child's message_handler
    if (interface.message !== null && message_handler !== undefined) {
      message_handler(interface.message)
      interface.message = null
    }

    // focus child
    window.frames[0].focus()
  },
  add_button: (html, func) => {
    // the button's id is "button-(the number of buttons present)"
    let id = `button-${$("#button-container").children().length}`
    $("#button-container").append(`<div class="button" id="${id}">${html}</div>`)
    $(`#${id}`).click(() => {
      func()
      // re-focus child
      window.frames[0].focus()
    })
  },
  window_ref_store: {}
}

var theme = {
  name : null,
  element: null
}

$(document).ready(() => {
  tools.storage.get_key("starting-page", load_page, DEFAULT_PAGE)

  $("#content").on("load", set_toolbar_title)

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

  $("#dim").click(() => {
    toggle_hamburger()
    toggle_menu()
  })

  $("#overflow-menu").click(toggle_overflow_menu)

  $("#overflow-close").click(toggle_overflow_menu)

  $("#menu-list li").click((item) => menu_item_clicked(item.currentTarget.id))

  $.getJSON("package.json").done((data) => {
    $("#version").html(`Version / ${data.version}`)
  })

  window.addEventListener('message', child_to_parent_message_handler, false)
  materialDesignHamburger()
})

function set_toolbar_title() {
  // all page paths follow this format: "page_name/page_name.html"
  let href = frames[0].location.pathname
  let id = /\/\w+\/(\w+).html/.exec(href)[1]

  $("#toolbar-title").text($(`#menu-list #${id}`).text())
}

function menu_item_clicked(id) {
  load_page(id)
  toggle_menu()
  toggle_hamburger()
}

function load_page(id) {
  if ($(`#menu-list #${id}`).length) {
    // if the page exists, load it
    $("#menu-list li").removeClass("active") //un-select all options
    $(`#menu-list #${id}`).addClass("active") // select the new one
    $("#content").attr("src", `${id}/${id}.html`)
  } else {
    // otherwise, reset preferences & load the default page
    console.error(`No such page '${id}', switching to default '${DEFAULT_PAGE}'`)
    tools.storage.clear()
    load_page(DEFAULT_PAGE)
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

function child_to_parent_message_handler(event) {
  // store the message & switch to the new page
  interface.message = event.data[1]
  load_page(event.data[0])
}

function toggle_overflow_menu() {
  $("#dropdown-menu").toggleClass("active")
  $("#overflow-close").toggleClass("active")
}

function toggle_menu() {
  $("#menu").toggleClass("active")
  $("#dim").toggleClass("active")
}
