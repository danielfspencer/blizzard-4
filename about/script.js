if (get_platform() == "electron") {
    window.$ = window.jQuery = module.exports; // avoid breaking jquery with node integration
}
var version = ""

$( document ).ready( () => {
    $.ajaxSetup({ cache: false }) // do not cache requests to check for latest version!

    $( "#licence" ).click( () => {
      if (get_platform() == "chrome") {
          chrome.app.window.create('../licence.html', {
            "resizable": true,
            "bounds": {
              width: 462,
              height: 680
            }
          })
      } else {
          window.open("../licence.html",'Licence','height=800,width=600')
      }
    })

    $( "#website" ).click( () => {
        window.open("https://github.com/danielfspencer/blizzard-4")
    })

    $( "#close" ).click( () => {
        window.close()
    })

    $.getJSON("../manifest.json")
        .done( (data) => {
            version = data["version_name"]
            $("#version-name").html(version)
    })

    $.getJSON("https://danielfspencer.github.io/blizzard-4/manifest.json")
        .done( (data) => {
            var latest_version = data["version_name"]
            if (version !== latest_version) {
                $("#version-status").html(" (newer version " + latest_version + " available)")
            } else {
                $("#version-status").html(" (up to date)")
            }
        })
        .fail( () => {
            $("#version-status").html(" (error checking for new version)")
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
