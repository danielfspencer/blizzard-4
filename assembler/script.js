let assembling = false

$( document ).ready( () => { //connect all the butons to their actions!
  $("#load_in").change((event) => {
    tools.files.load(event, (data) => {
      $('#in').val(data);
    })
  })

  $("#cmp").click(assemble)

  $("#load").click( () => {
    parent.postMessage(["menu-item-emu",$("#out").val()],"*")
  })

  $("#run").click( () => {
    parent.postMessage(["menu-item-emu",$("#out").val(),true],"*")
  })

  $("#debug").change(function() {
    worker.postMessage(["debug",this.checked])
  })

  $("#auto").change(function() {
    if(this.checked) {
      $("#in").on( "keyup", assemble)
    } else {
      $("#in").off()
    }
  })

  $(document).on("keydown", (event) => {
    if ((event.keyCode == 10 || event.keyCode == 13) && event.ctrlKey) {
      assemble()
    }
  })

  $(".lined-dec").linedtextarea({selectedLine: 1, dec:true})

  $(".lined").linedtextarea({selectedLine: 1, dec:false})

  $("#in").on( "keyup", assemble)

  $("#in").on("keydown", function (e) {
    var keyCode = e.keyCode || e.which
    if (keyCode === 9) {
      e.preventDefault()
      var start = this.selectionStart
      var end = this.selectionEnd
      var val = this.value
      var selected = val.substring(start, end)
      var re = /^/gm
      var count = selected.match(re).length
      this.value = val.substring(0, start) + selected.replace(re, '  ') + val.substring(end)
      this.selectionStart = start
      this.selectionEnd = end + count
    }
  })

  worker = new Worker("engine.js")
  worker.onmessage = (e) => {
    handleMsg(e.data)
  }

  worker.onerror = (e) => {
    msg = "Internal assembler error, line " + e.lineno + ":\n" + e.message
    log("error",msg)
  }

  parent.interface.funcs.input_data = set_input
  parent.interface.funcs.child_page_loaded()
})

function handleMsg(data) {
  switch(data[0]) {
    case "result":
      assembling = false
      $("#out").val(data[1])
      break
    case "log":
      log(data[1],data[2])
      break
  }
}

function assemble() {
  if (!assembling) {
    $("#log").empty()
    assembling = true
    worker.postMessage(['assemble',$("#in").val()])
  }
}

function log(level,msg) {
  var first = "<div class='item "+level+"'><img class='img' src='../assets/icons/"+level+".svg'/><src>"
  var second = "</src></div>"
  $("#log").append(first+msg+second)
  $("#log").scrollTop($("#log")[0].scrollHeight - $("#log").height())
}

function set_input(string) {
  $("#in").val(string)
  assemble()
}
