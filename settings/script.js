if (get_platform() == "electron") {
  window.$ = window.jQuery = module.exports; // avoid breaking jquery with node integration
}

$( document ).ready( () => {
  storage_get_key("starting-page", (val) => {
    $("#starting-page").val(val)
  } ,"dem")

  storage_get_key("theme", (val) => {
    $("#theme").val(val)
  } ,"dark")

  storage_get_key("emulator-display-colour", (val) => {
    $("#emulator-display-colour").val(val)
  } ,"green-grey")

  $( "#close" ).click( () => {
    window.close()
  })

  $( "#reset" ).click( () => {
    storage_clear()
  })

  $( "#theme" ).change(function() {
    storage_set_key("theme",$(this).val())
  })

  $( "#starting-page" ).change(function() {
    storage_set_key("starting-page",$(this).val())
  })

  $("#emulator-display-colour").change(function() {
    storage_set_key("emulator-display-colour", $(this).val())
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

function inject_stylesheet(path, target) {
  var stylesheet = document.createElement("link")
  stylesheet.href = path
  stylesheet.rel = "stylesheet"
  stylesheet.type = "text/css"
  target.body.appendChild(stylesheet)
}

function set_theme(theme) {
  if (theme == "light") { return }
  var path = "../assets/themes/" + theme
  inject_stylesheet(path + "_content.css", document)
  inject_stylesheet(path + "_frame.css", document)
}
