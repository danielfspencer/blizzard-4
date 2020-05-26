let version = ""

$( document ).ready( () => {
  $.ajaxSetup({ cache: false }) // do not cache requests to check for latest version!

  $( "#licence" ).click( () => {
    windows.open_external("https://www.gnu.org/licenses/gpl-3.0")
  })

  $( "#github" ).click( () => {
    windows.open_external("https://github.com/danielfspencer")
  })

  $( "#website" ).click( () => {
    windows.open_external("https://github.com/danielfspencer/blizzard-4")
  })

  $( "#close" ).click(() => window.close())

  $.getJSON("../manifest.json")
    .done( data => {
      version = data.version_name
      $("#version-name").html(version)

      $.getJSON("https://danielfspencer.github.io/blizzard-4/manifest.json")
        .done( data => {
          let latest_version = data.version_name
          if (version !== latest_version) {
            $("#version-status").html(` (version ${latest_version} available)`)
          } else {
            $("#version-status").html(" (up to date)")
          }
        })
        .fail( () => {
          $("#version-status").html(" (error checking for new version)")
        })
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
