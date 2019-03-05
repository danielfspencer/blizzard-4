var version = "";

$( document ).ready(function() {
    $( "#licence" ).click(function() {
      if (!window.chrome) {
        window.open("../licence.html",'Licence','height=800,width=600');
      } else {
          chrome.app.window.create('../licence.html', {
            "resizable": true,
            "bounds": {
              width: 462,
              height: 680
            }
          });
        }
    });

    $( "#close" ).click(function() {
        window.close();
    });

    $.getJSON("../manifest.json")
        .done(function(data) {
            version = data["version"]
            $("#ver").html("Version: " + version);
    })

    $.getJSON("https://danielfspencer.github.io/blizzard-4/manifest.json")
        .done(function(data) {
            if (data["version"] !== version) {
                $("#latest_ver").html("Latest Version: " + data["version"] + " (update available)");
            } else {
                $("#latest_ver").html("Latest Version: " + data["version"] + " (up to date)");
            }
        })
        .fail( function() {
            $("#latest_ver").html("Latest Version: (error checking for new version)");
        })
});
