$(document).ready( () => {
  canvas = document.getElementById("memory")
  canvas_context = canvas.getContext("2d", { alpha: false })

  $( "#close" ).click(() => window.close())
  pixel_on_colours = [255,255,255]
  pixel_off_colours = [0,0,0]
  ram_changes_buffer = []

  // for (let i = 0; i < 16384; i++) {
  // 	if ( i % 1024 == 0) {
  //   	num = 65535
  //   } else {
	// 	num = i
  //   }
  //   ram_changes_buffer.push([i,num])
  // }

  start_updates()
})


function start_updates() {
  requestAnimationFrame(animation_frame_handler)
}

function animation_frame_handler() {
  draw_screen_updates()
  animation_frame = requestAnimationFrame(animation_frame_handler)
}


function draw_screen_updates() {
  var img_data = canvas_context.createImageData(16,1)

  for (var j = 0; j < ram_changes_buffer.length; j++) {
    var item = ram_changes_buffer[j]
    var address = item[0]
    var word = item[1]
    var x = Math.floor(address / 512) * 16
    var y = (address % 512)

    for (var i = 0; i < img_data.data.length; i += 4) {
      var mask = 1 << (15 - (i/4))

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

  ram_changes_buffer = []
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
