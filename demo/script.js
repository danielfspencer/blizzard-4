const path = 'example_programs/'

$(document).ready(() => {
  $.getJSON(path + 'index.json', (data) => {
    $.each(data, (key, value) => {
      let html = ''
      html += "<div class='card entry' id=" + key + '>'
      html += "<div class='img-container'><div class='img-box'>"
      html += "<img src='" + path + '/img/' + key + ".png'/>"
      html += "</div></div><div class='text-container'><div class='text-box'>"
      html += '<h3>' + value.name + '</h3>'
      html += value.desc
      html += "</div></div><div class='button-container'> \
        <div class='button run'>run</div> \
        <div class='button src'>view source</div> \
        </div></div>"
      $('#content').append(html)

      $('#' + key + ' > .button-container > .run').click(() => {
        run(key, value.clock_speed)
      })

      $('#' + key + ' > .button-container > .src').click(() => {
        view(key)
      })
    })
  })
})

function run (name, clock_speed) {
  load(name, (input) => {
    compile(input, (asm) => {
      assemble(asm, (bin) => {
        switch_emu(bin, clock_speed)
      }, () => switch_asm(asm))
    }, () => switch_cmp(input))
  })
}

function view (name) {
  load(name, (input) => switch_cmp(input))
}

function load (name, success) {
  $.ajax({
    url: path + name + '.b4',
    dataType: 'text',
    success: (data) => {
      success(data)
    }
  })
}

function switch_emu (input, clock_speed) {
  parent.postMessage(['menu-item-emu', input, true, clock_speed], '*')
}

function switch_cmp (input) {
  parent.postMessage(['menu-item-cmp', input], '*')
}

function switch_asm (input) {
  parent.postMessage(['menu-item-asm', input], '*')
}

function compile (input, success, fail) {
  const compiler = new Worker('../compiler/engine.js')
  compiler.onmessage = (msg) => handle_message(msg, success, fail)
  compiler.postMessage(['compile', input])
}

function assemble (input, success, fail) {
  const assembler = new Worker('../assembler/engine.js')
  assembler.onmessage = (msg) => handle_message(msg, success, fail)
  assembler.postMessage(['assemble', input])
}

function handle_message (msg, success, fail) {
  const data = msg.data
  if (data[0] === 'result') {
    if (data[1] === '') {
      fail()
    } else {
      success(data[1])
    }
  }
}
