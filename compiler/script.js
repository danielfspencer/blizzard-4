let realtime = true
let compiling = false

$( document ).ready( () => {
  $(".lined-dec").linedtextarea({selectedLine: 1, dec:true})

  $("#load_in").change( (e) => {
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

  $(document).on("keydown", (event) => {
    if ((event.keyCode == 10 || event.keyCode == 13) && event.ctrlKey) {
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
    let asm = $("#out").val()
    assemble(asm, (bin) => {
      switch_emu(bin)
    }, () => switch_asm(asm))
  })

  $("#in").on( "keyup", (event) => {
    if (!realtime) {return}
    if (![37,38,39,40].includes(event.keyCode)) {
      compile()
    }
  })

  worker = new Worker("engine.js")
  worker.onmessage = (e) => {
    handleMsg(e.data)
  }

  worker.onerror = (e) => {
    msg = "Internal compiler error, line " + e.lineno + ": <br>" + e.message
    log("error",msg)
  }

  parent.input_data = set_input
  parent.child_page_loaded()
})

function handleMsg(data) {
  switch(data[0]) {
    case "update":
      $("#progress").attr("value",data[1])
      break
    case "result":
      compiling = false
      $("#out").val(data[1])
      break
    case "log":
      log(data[1],data[2])
      break
  }
}

function compile() {
  if (!compiling) {
    $("#log").empty()
    worker.postMessage(["compile",$("#in").val()])
    compiling = true
  }
}

function assemble(input, success, fail) {
  let assembler = new Worker('../assembler/engine.js')
  assembler.onmessage = (msg) => {
    let data = msg.data
    if (data[0] === 'result') {
      if (data[1] === '') {
        fail()
      } else {
        success(data[1])
      }
    }
  }
  assembler.postMessage(['assemble',input])
}

function switch_emu(input) {
  parent.postMessage(["menu-item-emu", input, true],"*")
}

function switch_asm(input) {
  parent.postMessage(["menu-item-asm", input],"*")
}

function log(level,msg) {
  var first = "<div class='item "+level+"'><img class='img' src='../assets/icons/"+level+".svg'/><src>"
  var second = "</src></div>"
  $("#log").append(first+msg+second)
  $("#log").scrollTop($("#log")[0].scrollHeight - $("#log").height())
}

function set_input(string) {
  $("#in").val(string)
  compile()
}
