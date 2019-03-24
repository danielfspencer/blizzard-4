var version = ""

$( document ).ready(function() {
    $( "#licence" ).click(function() {
      if (is_chrome_app()) {
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
            if (data["version"] !== version) {
                $("#latest_ver").html("Latest Version: " + data["version"] + " (update available)")
            } else {
                $("#latest_ver").html("Latest Version: " + data["version"] + " (up to date)")
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
