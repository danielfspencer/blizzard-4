let converter = new showdown.Converter()
converter.setFlavor('github')

$( document ).ready( () => {
  render_page("md_test")
})

function render_page(name) {
  $.ajax({
    url: `docs/${name}.md`,
    dataType: "text",
    success: (data) => {
      $("#content").html(converter.makeHtml(data))
      $("a").click(link_handler)
    },
    error: (err) => {
      $("#content").text(`Cannot load manual page '${name}'`)
    }
  })
}

function link_handler(element) {
  if (this.hash !== "") {
    // this is just an anchor link to a header,
    // so allow propagation as usual
    return true
  }
  
  console.log(this.pathname)
  return false // prevent default action
}
