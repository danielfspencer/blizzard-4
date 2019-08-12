let converter = new showdown.Converter()
converter.setFlavor('github')

$( document ).ready( () => {
  render_page("docs/introduction.md")
})

function render_page(path) {
  console.log(`rendering path '${path}'`)
  $.ajax({
    url: path,
    dataType: "text",
    success: (data) => {
      $("#content").html(converter.makeHtml(data))
      $("a").click(link_handler)
      $('img').each(remap_img_src)
    },
    error: (err) => {
      $("#content").html(`<div class="error">\
        Cannot load manual page '${path}'\
        </div>`)
    }
  })
}

function link_handler() {
  if (this.hash !== "") {
    // this is just an anchor link to a header,
    // so allow propagation as usual
    return true
  }

  render_page(".." + this.pathname)
  return false // prevent default action
}

function remap_img_src() {
  // electron + filesystem hosting requires this change
  let element = $(this)
  let src = element.attr('src')
  element.attr('src',".." + src);
}
