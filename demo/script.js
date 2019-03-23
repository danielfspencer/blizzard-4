const path = "../assets/example_programs/"

$(document).ready(init)

function init() {
  parent.child_set_theme(document)

  $.getJSON(path+"index.json", function(data) {
    $.each(data, function(key,value) {
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
        view_or_run(key,true)
      })
      $("#" + key + " > .button-container > .src").click( () => {
        view_or_run(key,false)
      })
    })
  })
}

function view_or_run(name,run) {
  $.ajax({
    url: path + name + ".b4cl",
    dataType: "text",
    success: function(data) {
        parent.postMessage(["cmp",data,run],"*")
    }
  })
}
