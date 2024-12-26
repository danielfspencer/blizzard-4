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

  parent.interface.child_page_loaded()
})

function run(name, clock_speed) {
  load(name)
  .then((b4) =>
    tools.headless.compile(b4)
    .catch(() => {
      tools.pages.switch("compiler", b4)
      return Promise.reject()
    })
  )
  .then((asm) =>
    tools.headless.assemble(asm)
    .catch(() => {
      tools.pages.switch("assembler", asm)
      return Promise.reject()
    })
  )
  .then((bin) =>
    tools.pages.switch("emulator", {
      binary: bin,
      clock_speed: clock_speed,
      autostart: true
    })
  )
}

function view(name) {
  load(name)
  .then((b4) =>
    tools.pages.switch("compiler", b4)
  )
}

function load(name, callback) {
  return $.ajax({
    url: `${path}/${name}.b4`,
    dataType: 'text'
  })
}
