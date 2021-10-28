const DEFAULT_PAGE = "introduction.md"

const converter = new showdown.Converter()
converter.setFlavor('github')

let current_path
let back_history = []
let forward_history = []

$( document ).ready( () => {
  render_page(DEFAULT_PAGE, 0)

  parent.interface.child_page_loaded()
  parent.interface.add_button(gen_button("left-arrow.svg"), navigate_back)
  parent.interface.add_button(gen_button("right-arrow.svg"), navigate_forward)
})

function gen_button(icon) {
  return `<img src='assets/icons/${icon}'/>`
}

function render_page(path, position) {
  $.ajax({
    url: `docs/${path}`,
    dataType: "text",
    success: (data) => {
      $("#content").html(converter.makeHtml(data))
      window.scroll(0, position)
      $("#content img").each(remap_img_src)
      $("a").click(link_handler)
      current_path = path
    },
    error: (err) => {
      $("#content").html(`<div class="error">
        Cannot load manual page '${path}'
        </div>`)
    }
  })
}

function link_handler() {
  if (this.hash !== "") {
    // this is just an anchor link to a header, so allow propagation as usual
    return true
  }

  if (this.href.startsWith("http")) {
    // this is a link to the web, so open with web browser
    windows.open_external(this.href)
    return false
  }

  // extract the "docs/page.md" path of the link URL as it may be prefixed on electron
  let relative = /\/manual\/(.*)/.exec(this.pathname)[1]
  let path = /(?:docs\/)?(.*\.md)/.exec(relative)[1]

  back_history.push(current_page())
  render_page(path, 0)

  forward_history = []
  return false // prevent default action
}

function remap_img_src() {
  // electron + filesystem hosting requires this change
  let element = $(this)
  let src = element.attr('src')
  element.attr('src', `..${src}`);
}

function navigate_back() {
  if (back_history.length > 0) {
    forward_history.push(current_page())
    render_page(...back_history.pop())
  }
}

function navigate_forward() {
  if (forward_history.length > 0) {
    back_history.push(current_page())
    render_page(...forward_history.pop())
  }
}

function current_page() {
  return [current_path, window.pageYOffset]
}
