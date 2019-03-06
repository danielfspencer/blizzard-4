const path = "../assets/example_programs/"

$(document).ready(init)

function init() {
  $.getJSON(path+"index.json", function(data) {
    $.each(data, function(key,value) {
      var html = "";
      html += "<div class='card entry' id="+key+">"
      html += "<div class='img-container'><div class='img-box'>"
      html += "<img src='" + path + "/img/" + key + ".png'/>"
      html += "</div></div><div class='text-container'>"
      html += "<h3>" + value.name + "</h3>"
      html += value.desc
      html += "</div><div class='button-container'> \
              <div class='button run'>run</div> \
              <div class='button src'>view source</div> \
              </div></div>"
      $("#content").append(html)
      $("#" + key + " > .button-container > .run").click( () => {
        run(key)
      })
      $("#" + key + " > .button-container > .src").click( () => {
        view(key)
      })
    })
  })
}

function run(name) {
  console.log("run " + name)
  parent.postMessage(["cmp",$("#out").val()],"*")
}

function view(name) {
  $.get(path+name+".b4cl", function(data) {
      console.log(data)
      parent.postMessage(["cmp",data],"*")
  })
}
