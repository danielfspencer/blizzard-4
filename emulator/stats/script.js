$(document).ready(() => {
  $( "#close" ).click(() => window.close())
})

function set_theme(name) {
  $.ajax({
    url: `../../assets/themes/${name}.css`,
    dataType: 'text',
    success: (data) => {
      let style_tag = document.createElement('style')
      style_tag.innerHTML = data
      document.body.appendChild(style_tag)
    }
  })
}
