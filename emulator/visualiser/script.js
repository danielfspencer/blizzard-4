let counter = 0

$(document).ready( () => {
  canvas = document.getElementById("memory")
  canvas_context = canvas.getContext("2d", { alpha: false })

  $( "#close" ).click(() => window.close())
  pixel_on_colours = [255,255,255]
  pixel_off_colours = [0,0,0]
  ram_changes_buffer = []

  start_updates()
})

function benchmark() {
  for (let i = 0; i < 16384; i++) {
    if ( i % 1024 == 0) {
      num = 65535
    } else {
      num = i
    }
    ram_changes_buffer.push([i,num])
  }

  console.time('benchmark')
  draw_screen_updates()
  console.timeEnd('benchmark')
}

function start_updates() {
  requestAnimationFrame(animation_frame_handler)
}

function animation_frame_handler() {
  if (counter > 1) {
    draw_screen_updates()
    counter = 0
  }

  counter++
  animation_frame = requestAnimationFrame(animation_frame_handler)
}

function draw_word_fill(word, x, y) {
  for (let i = 0; i < 16; i ++) {
    let mask = 1 << (15 - (i))

    if ((word & mask) != 0) {
      canvas_context.fillStyle = `rgb(255,255,255)`
    } else {
      canvas_context.fillStyle = `rgb(0,0,0)`
    }

    canvas_context.fillRect(x+i, y, 1, 1)
  }
}

function draw_word_img(word, x, y, img_data) {

  for (let i = 0; i < img_data.data.length; i += 4) {
    let mask = 1 << (15 - (i/4))

    if ((word & mask) != 0) {
      var [red, green, blue] = pixel_on_colours
    } else {
      var [red, green, blue] = pixel_off_colours
    }
    img_data.data[i]     = red
    img_data.data[i + 1] = green
    img_data.data[i + 2] = blue
    img_data.data[i + 3] = 255
  }
  canvas_context.putImageData(img_data,x,y)
}

function draw_screen_updates() {
  let img_data = canvas_context.createImageData(16,1)

  for (let j = 0; j < ram_changes_buffer.length; j++) {
    let item = ram_changes_buffer[j]
    let address = item[0]
    let word = item[1]
    let x = (address >> 9) * 16
    let y = (address & 511)

    // draw_word_fill(word, x, y)
    draw_word_img(word, x, y, img_data)
  }

  ram_changes_buffer = []
}

function clear_screen() {
  let [red, green, blue] = pixel_off_colours
  canvas_context.fillStyle = `rgb(${red}, ${green}, ${blue})`
  canvas_context.fillRect(0, 0, 512, 512)
}

function set_theme(name) {
  $.ajax({
    url: `../../assets/themes/${name}.css`,
    dataType: 'text',
    success: (data) => {
      let style_tag = document.createElement('style')
      style_tag.innerHTML = data
      document.body.appendChild(style_tag)
    }
  })
}
