let run_when_assembled = false
let target_clock_speed = 100000
let assembling = false

$( document ).ready( () => { //connect all the butons to their actions!
  $("#load_in").change((e) => {
    load_file(e, "in")
  })

  $("#cmp").click(assemble)

  $("#load").click( () => {
    parent.postMessage(["menu-item-emu",$("#out").val()],"*")
  })

  $("#run").click( () => {
    parent.postMessage(["menu-item-emu",$("#out").val(),true],"*")
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
    msg = "Internal assembler error, line " + e.lineno + ": <br>" + e.message
    console.error(msg)
  }

  parent.input_data = set_input
  parent.child_page_loaded()
})

function assemble() {
  if (!assembling) {
    assembling = true
    worker.postMessage(['assemble',$("#in").val()])
  }
}

function set_input([string, shouldRun, clock_speed]) {
  $("#in").val(string)
  run_when_assembled = shouldRun
  target_clock_speed = clock_speed
  assemble()
}

function handleMsg(data) {
  switch(data[0]) {
    case "result":
      assembling = false
      let result = data[1]

      if (run_when_assembled) {
        if (result.startsWith("error")) {
          $("#out").val(result)
        } else {
          parent.postMessage(["menu-item-emu", result, true, target_clock_speed],"*")
        }
      } else {
        $("#out").val(result)
      }
      break
    case "log":
      console.log(data[1],data[2])
      break
  }
}
