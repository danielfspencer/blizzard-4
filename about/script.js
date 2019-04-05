if (get_platform() == "electron") {
    window.$ = window.jQuery = module.exports; // avoid breaking jquery with node integration
}
var version = ""

$( document ).ready(function() {
    $( "#licence" ).click(function() {
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

    $( "#close" ).click(function() {
        window.close()
    })

    $.getJSON("../manifest.json")
        .done(function(data) {
            version = data["version_name"]
            $("#ver").html("Version: " + version)
    })

    $.getJSON("https://danielfspencer.github.io/blizzard-4/manifest.json")
        .done(function(data) {
            var latest_version = data["version_name"]
            if (version !== latest_version) {
                $("#latest_ver").html("Latest Version: " + latest_version + " (update available)")
            } else {
                $("#latest_ver").html("Latest Version: " + latest_version + " (up to date)")
            }
        })
        .fail( function() {
            $("#latest_ver").html("Latest Version: (error checking for new version)")
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
