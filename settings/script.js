$( document ).ready( () => {
  tools.storage.get_key("starting-page", (val) => {
    $("#starting-page").val(val)
  } ,"dem")

  tools.storage.get_key("theme", (val) => {
    $("#dark-theme").prop('checked', val == "dark")
  } ,"dark")

  tools.storage.get_key("emulator-display-colour", (val) => {
    $("#emulator-display-colour").val(val)
  } ,"green-grey")

  $( "#close" ).click( () => {
    window.close()
  })

  $( "#reset" ).click( () => {
    tools.storage.clear()
  })

  $( "#dark-theme" ).change(function() {
    if ($(this).prop("checked")) {
      tools.storage.set_key("theme","dark")
    } else {
      tools.storage.set_key("theme","light")
    }
  })

  $( "#starting-page" ).change(function() {
    tools.storage.set_key("starting-page",$(this).val())
  })

  $("#emulator-display-colour").change(function() {
    tools.storage.set_key("emulator-display-colour", $(this).val())
  })

  $( "#platform" ).html( () => {
    switch (get_platform()) {
      case "electron":   return "Electron App"
      case "chrome_app": return "Chrome App"
      case "website":    return "Website"
      default:           return "Unknown"
    }
  })
})

/* theme setting */

function set_theme(name) {
  $.ajax({
    url: `../assets/themes/${name}.css`,
    dataType: 'text',
    success: (data) => {
      let style_tag = document.createElement('style')
      style_tag.innerHTML = data
      document.body.appendChild(style_tag)
    }
  })
}
