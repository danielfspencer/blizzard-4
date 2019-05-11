const path = "../assets/example_programs/"

$(document).ready( () => {
  $.getJSON(path+"index.json", (data) => {
    $.each(data, (key,value) => {
      var html = "";
      html += "<div class='card entry' id="+key+">"
      html += "<div class='img-container'><div class='img-box'>"
      html += "<img src='" + path + "/img/" + key + ".png'/>"
      html += "</div></div><div class='text-container'><div class='text-box'>"
      html += "<h3>" + value.name + "</h3>"
      html += value.desc
      html += "</div></div><div class='button-container'> \
              <div class='button run'>run</div> \
              <div class='button src'>view source</div> \
              </div></div>"
      $("#content").append(html)
      $("#" + key + " > .button-container > .run").click( () => {
        view_or_run(key, true, value.clock_speed)
      })
      $("#" + key + " > .button-container > .src").click( () => {
        view_or_run(key,false, value.clock_speed)
      })
    })
  })
})

function view_or_run(name, run, clock_speed) {
  $.ajax({
    url: path + name + ".b4cl",
    dataType: "text",
    success: (data) => {
        console.log(data)
        parent.postMessage(["menu-item-cmp", data, run, clock_speed],"*")
    }
  })
}
