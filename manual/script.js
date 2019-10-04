let converter = new showdown.Converter()
converter.setFlavor('github')

let back_history = []
let forward_history = []

$( document ).ready( () => {
  render_page("docs/introduction.md")

  parent.interface.funcs.add_button(gen_button("left-arrow.svg"), navigate_back)
  parent.interface.funcs.add_button(gen_button("right-arrow.svg"), navigate_forward)
})

function gen_button(icon) {
  return `<img style='margin-top: 6px;' class='manual_nav_button' src='assets/icons/${icon}'/>`
}

function render_page(path) {
  $.ajax({
    url: path,
    dataType: "text",
    success: (data) => {
      $("#content").html(converter.makeHtml(data))
      $("#content img").each(remap_img_src)
      $("a").click(link_handler)
      back_history.push(path)
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
  forward_history = []
  return false // prevent default action
}

function remap_img_src() {
  // electron + filesystem hosting requires this change
  let element = $(this)
  let src = element.attr('src')
  element.attr('src',".." + src);
}

function navigate_back() {
  if (back_history.length > 1) {
    forward_history.push(back_history.pop())
    render_page(back_history.pop())
  }
}

function navigate_forward() {
  if (forward_history.length > 0) {
    render_page(forward_history.pop())
  }
}
