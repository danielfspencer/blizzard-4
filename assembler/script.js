let worker
let busy = false

$(document).ready(() => {
  worker = new Worker("engine.js")
  worker.onmessage = handle_message
  worker.onerror = (error) => {
    busy = false
    log("error", `Internal assembler error, line ${error.lineno}:\n${error.message}`)
  }

  $(".lined-dec").linedtextarea({selectedLine: 1, dec:true})

  $(".lined").linedtextarea({selectedLine: 1, dec:false})

  $("#load_in").change((event) => {
    tools.files.load(event, (data) => {
      $("#in").val(data)
    })
  })

  $("#load").click(() =>
    tools.pages.switch("emulator", {
      binary: $("#out").val(),
      autostart: false
    })
  )

  $("#run").click(() =>
    tools.pages.switch("emulator", {
      binary: $("#out").val(),
      autostart: true
    })
  )

  $("#assemble").click(assemble)

  $("#debug").change((event) => {
    worker.postMessage(["debug", $(event.target).prop('checked')])
  })

  $(document).on("keydown", (event) => {
    if ((event.keyCode == 10 || event.keyCode == 13) && event.ctrlKey) {
      assemble()
    }
  })

  tools.text_input.on_non_modifier_keypress(document.querySelector("#in"), () => {
    if ($("#auto").prop('checked')) {
      assemble()
    }
  })

  parent.interface.child_page_loaded()
  tools.text_input.focus_start(document.querySelector("#in"))
})

function inter_page_message_handler(message) {
  $("#in").val(message)
  assemble()
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

function assemble() {
  if (!busy) {
    $("#log").empty()
    busy = true
    worker.postMessage(["assemble", $("#in").val()])
  }
}

function log(level,msg) {
  let html = `<div class='item ${level}'><img class='img' src='../assets/icons/${level}.svg'/><src>${msg}</src></div>`
  $("#log").append(html)
  $("#log").scrollTop($("#log")[0].scrollHeight - $("#log").height())
}
