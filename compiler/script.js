function handleMsg(data) {
  switch(data[0]) {
    case "update":
      $("#progress").attr("value",data[1])
      break
    case "result":
      if (assemble_when_compiled) {
        if (data[1] !== undefined) {
        parent.postMessage(["menu-item-asm", data[1], true, target_clock_speed],"*")
        }
      } else {
        $("#out").val(data[1])
      }
      compiling = false
      break
    case "log":
      log(data[1],data[2])
      break
    case "score":
      log("info",data[1] + " lines/second")
      break
    default:
      break
  }
}

function compile() {
  if (compiling) {return}
  worker.postMessage(["input",$("#in").val().split("\n")])
  $("#progress").attr("value",0)
  $("#log").empty()
  worker.postMessage(["compile"])
  compiling = true
}

function log(level,msg) {
  var first = "<div class='item "+level+"'><img class='img' src='../assets/icons/"+level+".svg'/><src>"
  var second = "</src></div>"
  $("#log").append(first+msg+second)
  $("#log").scrollTop($("#log")[0].scrollHeight - $("#log").height())  // don't do this when debug is on (too laggy), just scroll to the end
  //~ $("#log").animate({scrollTop: $("#log")[0].scrollHeight - $("#log").height() - 1 }, 100)
}

function set_input([string, shouldAssemble, clock_speed]) {
  document.getElementById("in").value = string
  if (shouldAssemble) {
  assemble_when_compiled = true;
  target_clock_speed = clock_speed
  }
  compile()
}

var compiling = false
var realtime = true
var assemble_when_compiled = false
var target_clock_speed = 0

$( document ).ready( () => {
  $(".lined-dec").linedtextarea({selectedLine: 1, dec:true})

  $("#load_in").change((e) => {
    load_file(e, "in")
  })

  $(document).delegate('#in', 'keydown', function(e) {
    var keyCode = e.keyCode || e.which

    if (keyCode == 9) {
      e.preventDefault()
      var start = $(this).get(0).selectionStart
      var end = $(this).get(0).selectionEnd
      $(this).val($(this).val().substring(0, start) + "  " + $(this).val().substring(end))
      $(this).get(0).selectionStart =
      $(this).get(0).selectionEnd = start + 2
    }
  })

  $(document).on("keydown", (e) => {
    if ((e.keyCode == 10 || e.keyCode == 13) && e.ctrlKey) {
      compile()
    }
  })

  $("#cmp").click( () => {
    compile()
  })

  $("#bench").click( () => {
    worker.postMessage(["bench",500])
  })

  $("#auto").change(function() {
    realtime = this.checked
  })

  $("#debug").change(function() {
    worker.postMessage(["debug",this.checked])
  })

  $("#assemble").click( () => {
    parent.postMessage(["menu-item-asm",$("#out").val()],"*")
  })

  $("#run").click( () => {
    parent.postMessage(["menu-item-asm",$("#out").val(),true],"*")
  })

  $("#in").on( "keyup", (e) => {
    if (!realtime) {return}
    if (![37,38,39,40].includes(e.keyCode)) {
      compile()
    }
  })

  worker = new Worker("engine.js")
  worker.onmessage = (e) => {
    handleMsg(e.data)
  }

  parent.input_data = set_input
  parent.child_page_loaded()
})
