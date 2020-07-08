let worker
let busy = false

$(document).ready(() => {
  worker = new Worker("engine.js")
  worker.onmessage = handle_message
  worker.onerror = (error) => {
    busy = false
    log("error", `Internal compiler error, line ${error.lineno}:\n${error.message}`)
  }
  
  $(".lined-dec").linedtextarea({selectedLine: 1, dec:true})

  $("#load_in").change((event) => {
    tools.files.load(event, (data) => {
      $("#in").val(data)
    })
  })

  $(document).delegate("#in", "keydown", (event) => {
    let keyCode = event.keyCode || event.which

    if (keyCode == 9) {
      event.preventDefault()
      let start = $(event.target).get(0).selectionStart
      let end = $(event.target).get(0).selectionEnd
      $(event.target).val($(event.target).val().substring(0, start) + "  " + $(event.target).val().substring(end))
      $(event.target).get(0).selectionStart =
      $(event.target).get(0).selectionEnd = start + 2
    }
  })

  $(document).on("keydown", (event) => {
    if ((event.keyCode == 10 || event.keyCode == 13) && event.ctrlKey) {
      compile()
    }
  })

  $("#compile").click(compile)

  $("#debug").change((event) => {
    worker.postMessage(["debug", $(event.target).prop('checked')])
  })

  $("#assemble").click(() =>
    tools.pages.switch("assembler", $("#out").val())
  )

  $("#run").click(() => {
    let asm = $("#out").val()

    tools.headless.assemble(asm)
    .catch(() => {
      tools.pages.switch("assembler", asm)
      throw new SyntaxError
    })
    .then((bin) =>
      tools.pages.switch("emulator", {
        binary: bin,
        autostart: true
      })
    )
  })

  tools.text_input.on_non_modifier_keypress(document.querySelector("#in"), () => {
    if ($("#auto").prop('checked')) {
      compile()
    }
  })

  parent.interface.child_page_loaded()
  tools.text_input.focus_start(document.querySelector("#in"))
})

function inter_page_message_handler(message) {
  $("#in").val(message)
  compile()
}

function handle_message(message) {
  let data = message.data

  switch(data[0]) {
    case "result":
      busy = false
      $("#out").val(data[1])
      break
    case "log":
      log(data[1],data[2])
      break
  }
}

function compile() {
  if (!busy) {
    $("#log").empty()
    busy = true
    worker.postMessage(["compile", $("#in").val()])
  }
}

function log(level,msg) {
  let html = `<div class='item ${level}'><img class='img' src='../assets/icons/${level}.svg'/><src>${msg}</src></div>`
  $("#log").append(html)
  $("#log").scrollTop($("#log")[0].scrollHeight - $("#log").height())
}
