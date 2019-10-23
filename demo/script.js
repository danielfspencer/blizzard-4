const path = 'example_programs'

$(document).ready(() => {
  $.getJSON(`${path}/index.json`, (data) => {
    $.each(data, (key, value) => {
      let html = `
      <div class='card entry' id='${key}'>
        <div class='img-container'><div class='img-box'>
          <img src='${path}/img/${key}.png'/>
        </div></div>
        <div class='text-container'><div class='text-box'>
          <h3>${value.name}</h3>${value.desc}
        </div></div>
        <div class='button-container'>
          <div class='button run'>run</div>
          <div class='button src'>view source</div>
        </div>
      </div>`

      $('#content').append(html)

      $(`#${key} > .button-container > .run`).click(() => run(key, value.clock_speed))

      $(`#${key} > .button-container > .src`).click(() => view(key))
    })
  })
})

function run(name, clock_speed) {
  load(name, (input) => {
    compile(input, (asm) => {
      assemble(asm, (bin) => {
        switch_emu(bin, clock_speed)
      }, () => switch_asm(asm))
    }, () => switch_cmp(input))
  })
}

function view(name) {
  load(name, (input) => switch_cmp(input))
}

function load(name, callback) {
  $.ajax({
    url: `${path}/${name}.b4`,
    dataType: 'text',
    success: data => callback(data)
  })
}

function switch_emu(input, clock_speed) {
  parent.postMessage(['menu-item-emu', input, true, clock_speed],'*')
}

function switch_cmp(input) {
  parent.postMessage(['menu-item-cmp', input],'*')
}

function switch_asm(input) {
  parent.postMessage(['menu-item-asm', input],'*')
}

function compile(input, success, fail) {
  let compiler = new Worker('../compiler/engine.js')
  compiler.onmessage = (msg) => handle_message(msg, success, fail)
  compiler.postMessage(['compile',input])
}

function assemble(input, success, fail) {
  let assembler = new Worker('../assembler/engine.js')
  assembler.onmessage = (msg) => handle_message(msg, success, fail)
  assembler.postMessage(['assemble',input])
}

function handle_message(msg, success, fail) {
  let data = msg.data
  if (data[0] === 'result') {
    if (data[1] === '') {
      fail()
    } else {
      success(data[1])
    }
  }
}
