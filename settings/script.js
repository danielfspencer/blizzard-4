$( document ).ready( () => {
  $("#theme").val(tools.storage.get_key("theme", "dark"))

  $("#starting-page").val(tools.storage.get_key("starting-page", "demo"))

  $("#emulator-display-colour").val(tools.storage.get_key("emulator-display-colour", "white-grey"))

  $( "#close" ).click(() => window.close())

  $( "#reset" ).click( () => {
    tools.storage.clear()
  })

  $( "#reset-flash" ).click( () => {
    tools.storage.remove_key("emulator_flash")
  })

  $( "#theme" ).change(function() {
    tools.storage.set_key("theme",$(this).val())
  })

  $( "#starting-page" ).change(function() {
    tools.storage.set_key("starting-page",$(this).val())
  })

  $("#emulator-display-colour").change(function() {
    tools.storage.set_key("emulator-display-colour", $(this).val())
  })

  $( "#platform" ).html( () => {
    switch (tools.platform()) {
      case "electron":   return "Electron App"
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
