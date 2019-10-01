/* global tools, $ */

$(document).ready(_ => {
  tools.storage.get_key('starting-page', val => {
    $('#starting-page').val(val)
  }, 'dem')

  tools.storage.get_key('theme', val => {
    $('#theme').val(val)
  }, 'dark')

  tools.storage.get_key('emulator-display-colour', val => {
    $('#emulator-display-colour').val(val)
  }, 'green-grey')

  $('#close').click(_ => window.close())

  $('#reset').click(tools.storage.clear)

  $('#theme').change(e => {
    tools.storage.set_key('theme', $(e.target).val())
  })

  $('#starting-page').change(e => {
    tools.storage.set_key('starting-page', $(e.target).val())
  })

  $('#emulator-display-colour').change(e => {
    tools.storage.set_key('emulator-display-colour', $(e.target).val())
  })

  $('#platform').html(_ => {
    switch (tools.platform()) {
      case 'electron': return 'Electron App'
      case 'chrome_app': return 'Chrome App'
      case 'website': return 'Website'
      default: return 'Unknown'
    }
  })
})

/* theme setting */

function set_theme (name) {
  $.ajax({
    url: `../assets/themes/${name}.css`,
    dataType: 'text',
    success: data => {
      const styleTag = document.createElement('style')
      styleTag.innerHTML = data
      document.body.appendChild(styleTag)
    }
  })
}
