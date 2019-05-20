$(document).ready( () => {
  worker = new Worker("engine.js")
  worker.onmessage = (e) => {
    handle_message(e.data)
  }

  document.addEventListener("keydown", (event) => { on_key_event(event, "keydown") })
  document.addEventListener("keyup", (event) => { on_key_event(event, "keyup") })

  vram_changes_buffer = []
  pixel_on_colour = 255
  pixel_off_colour = 0
  front_panel_info = {}

  updates_running = false

  canvas = document.getElementById("screen")
  canvas_context = canvas.getContext("2d", { alpha: false })
  clear_screen()

  led_strips = {
    "alu1_leds":null,
    "alu2_leds":null,
    "alu_write_leds":null,
    "alu_read_leds":null,
    "read_bus_leds":null,
    "write_bus_leds":null,
    "data_bus_leds":null,
    "out1_leds":null,
    "out2_leds":null,
    "out3_leds":null,
    "arg1_leds":null,
    "arg2_leds":null,
    "arg3_leds":null,
    "pc_leds":null,
    "ram_addr_leds":null,
    "rom_addr_leds": null,
    "opcode_leds": null,
    "cmd_word_1st_part_leds":null,
    "cmd_word_2nd_part_leds":null,
    "proc_mode_leds":null,
    "arg_num_leds":null,
    "frame_num_leds":null,
    "cnd_reg_leds":null,
    "ram_read_leds":null,
    "ram_offset_leds":null,
    "ram_write_leds":null,
    "ram_addr_mode_leds":null,
    "rom_read_leds":null,
    "rom_write_leds":null,
    "inp1_leds":null,
    "inp2_leds":null,
    "inp3_leds":null
  }

  for (var name in led_strips) {
    led_strips[name] = get_led_references(name)
  }

  $("#start").click( () => {
    send_user_input()
    worker.postMessage(["start"])
  })

  $("#stop").click( () => {
    worker.postMessage(["stop"])
  })

  $("#reset").click( () => {
    worker.postMessage(["reset"])
    worker.postMessage(["set_clock",$("#clock-target").val()])
    setTimeout(clear_screen, 150)
  })

  $("#step").mousedown( () => {
    worker.postMessage(["clock_high"])
  })

  $("#step, #read, #write, #copy").mouseup( () => {
    worker.postMessage(["clock_low"])
  })

  $("#read").mousedown( () => {
    worker.postMessage(["bus_read"])
  })

  $("#write").mousedown( () => {
    worker.postMessage(["bus_write"])
  })

  $("#copy").mousedown( () => {
    worker.postMessage(["bus_copy"])
  })

  $("#clock-target").change( () => {
    worker.postMessage(["set_clock",$("#clock-target").val()])
  })

  $("#usr1_input, #usr2_input, #usr3_input").on('input', send_user_input)

  $("#rom_write_protect").change(function() {
    worker.postMessage(["write_protect_change",this.checked])
  })

  worker.postMessage(["request_front_panel_info"])
  worker.postMessage(["set_clock",100000])
  parent.input_data = set_rom
  parent.child_page_loaded()
})

function set_rom([string, shouldRun, clock_speed]) {
  if (clock_speed !== undefined) {
    $("#clock-target").val(clock_speed)
    worker.postMessage(["set_clock",clock_speed])
  }
  worker.postMessage(["set_rom",string])
  if (shouldRun) {
    worker.postMessage(["start"])
  }
}

function send_user_input(event){
  var inputs = [$("#usr1_input").val(),$("#usr2_input").val(),$("#usr3_input").val()]
  var formatted_inputs = [0,0,0]
  for (var i = 0; i < 3; i++) {
    var integer = parseInt(inputs[i])
    if (integer > 65535) {
      integer = 65535
    } else if (integer < 0) {
      integer = 0
    }
    formatted_inputs[i] = integer
  }

  display_number_on_leds("inp1_leds", formatted_inputs[0])
  display_number_on_leds("inp2_leds", formatted_inputs[1])
  display_number_on_leds("inp3_leds", formatted_inputs[2])
  worker.postMessage(["user_input_update",formatted_inputs])
}

function handle_message(message) {
  switch(message[0]) {
    case "front_panel_info":
      front_panel_info = message[1]
      break
    case "vram_changes":
      vram_changes_buffer.push.apply(vram_changes_buffer,message[1])
      break
    case "started":
      //start drawing updates
      start_updates()
      break
    case "stopped":
      //stop drawing updates
      setTimeout(stop_updates, 100)
      break
    case "changed":
      //draw updates (the worker will have already sent them before responding changed)
      if (!updates_running) {
        draw_all()
      }
      break
    case "stop":
      stop_slow_step()
      break
    default:
      console.error("Unknown command '"+ message[0] +"'")
      break
    }
}

function start_updates() {
  if (!updates_running) {
    updates_running = true
    requestAnimationFrame(animation_frame_handler)
  }
}

function stop_updates() {
  if (updates_running) {
    updates_running = false
    cancelAnimationFrame(animation_frame)
  }
}

function start_slow_step(delay) {
  if (! updates_running) {
    start_updates()
    step_timer = setInterval( () => { slow_step(delay) }, delay)
  }
}

function stop_slow_step() {
  clearInterval(step_timer)
  stop_updates()
}

function slow_step(delay) {
  worker.postMessage(["clock_high"])
  setTimeout( () => { worker.postMessage(["clock_low"]) }, delay/2)
}

function benchmark() {
  console.time("leds")
  for (var i = 0; i < 500000; i++) {
    display_number_on_leds("data_bus_leds",i % 65535)
  }
  console.timeEnd("leds")
}

function clear_screen() {
  canvas_context.fillStyle = "rgb(" + pixel_off_colour + ", " + pixel_off_colour + ", " + pixel_off_colour + ")"
  canvas_context.fillRect(0, 0, 128, 128)
}

function get_led_references(id) {
  var element = document.getElementById(id)
  var references = {}

  var has_tooltip = element.children[0].className == "tooltip_content"
  references.leds = Array.prototype.slice.call(element.children)
  references.tooltip = null
  references.tooltip_visible = false

  if (has_tooltip) {
    references.leds = references.leds.slice(1)
    references.tooltip = element.children[0]
    element.addEventListener("mouseover", mouseover_tooltip)
    element.addEventListener("mouseout", mouseoff_tooltip)
  }

  var log10_of_leds_squared = Math.log10(Math.pow(2, references.leds.length))
  references.num_dec_digits = Math.ceil(log10_of_leds_squared)
  references.num_hex_digits = Math.ceil(log10_of_leds_squared / Math.log10(16))
  references.value = 0

  return references
}

function display_number_on_leds(id, number) {
  var references = led_strips[id]
  var leds = references.leds

  for (var i = 0; i < leds.length; i++) {
    var mask = 1 << (leds.length - i - 1)
    var ref = leds[i].classList
    if ((number & mask) != 0) {
      if (!ref.contains("on")) {
        ref.add("on")
      }
    } else {
      if (ref.contains("on")) {
        ref.remove("on")
      }
    }
  }

  references.value = number

  if (references.tooltip_visible) {
    update_tool_tip(id)
  }
}

function update_tool_tip(id) {
  var references = led_strips[id]
  var dec = get_padded_num(references.value, references.num_dec_digits,10)
  var hex = get_padded_num(references.value , references.num_hex_digits,16)

  var text = "dec " + dec + " hex " + hex
  references.tooltip.childNodes[0].nodeValue = text
}

function mouseover_tooltip() {
  var references = led_strips[this.id]
  if (updates_running) {
    references.tooltip_visible = true
  } else {
    update_tool_tip(this.id)
  }
}

function mouseoff_tooltip() {
  var references = led_strips[this.id]
  references.tooltip_visible = false
}

function get_padded_num(number,num_zeroes,base) {
  var string = number.toString(base)

  while (num_zeroes > string.length) {
    string = "0" + string
  }

  return string
}

function animation_frame_handler() {
  worker.postMessage(["request_front_panel_info"])
  worker.postMessage(["request_vram_changes"])
  draw_all()
  animation_frame = requestAnimationFrame(animation_frame_handler)
}

function draw_all() {
  draw_front_panel()
  draw_screen_updates()
}

function draw_front_panel() {
  $("#clock-actual").val(front_panel_info["clock_speed"])

  display_number_on_leds("alu1_leds", front_panel_info["alu_operands"][0])
  display_number_on_leds("alu2_leds", front_panel_info["alu_operands"][1])
  display_number_on_leds("read_bus_leds", front_panel_info["read_bus"])
  display_number_on_leds("data_bus_leds", front_panel_info["data_bus"])
  display_number_on_leds("write_bus_leds", front_panel_info["write_bus"])
  display_number_on_leds("cnd_reg_leds", front_panel_info["conditional_bit"])

  display_number_on_leds("pc_leds", front_panel_info["program_counter"])
  display_number_on_leds("frame_num_leds", front_panel_info["frame_number"])

  var command_string = get_padded_num(front_panel_info["command_word"],16,2)
  var first_part = parseInt(command_string.slice(0,5),2)
  var second_part = parseInt(command_string.slice(15,16),2)
  display_number_on_leds("cmd_word_1st_part_leds", first_part)
  display_number_on_leds("cmd_word_2nd_part_leds", second_part)
  display_number_on_leds("arg_num_leds", front_panel_info["args_remaining"])

  switch (front_panel_info["control_mode"]) {
    case 0:
      display_number_on_leds("proc_mode_leds", 0b100)
      break
    case 1:
      display_number_on_leds("proc_mode_leds", 0b010)
      break
    case 2:
      display_number_on_leds("proc_mode_leds", 0b001)
      break
    default:
      break
  }

  switch (command_string.slice(0,3)) {
    case "000":
      display_number_on_leds("opcode_leds", 0b100000)
      break
    case "001":
      display_number_on_leds("opcode_leds", 0b010000)
      break
    case "010":
      display_number_on_leds("opcode_leds", 0b001000)
      break
    case "011":
      display_number_on_leds("opcode_leds", 0b000100)
      break
    case "100":
      display_number_on_leds("opcode_leds", 0b000010)
      break
    case "101":
      display_number_on_leds("opcode_leds", 0b000001)
      break
    default:
      break
  }

  display_number_on_leds("arg1_leds", front_panel_info["arg_regs"][0])
  display_number_on_leds("arg3_leds", front_panel_info["arg_regs"][2])
  display_number_on_leds("arg2_leds", front_panel_info["arg_regs"][1])
  display_number_on_leds("out1_leds", front_panel_info["user_output"][0])
  display_number_on_leds("out2_leds", front_panel_info["user_output"][1])
  display_number_on_leds("out3_leds", front_panel_info["user_output"][2])

  if (front_panel_info["activity_indicators"]["alu1_write"]) {
    display_number_on_leds("alu_write_leds",2)
  } else if (front_panel_info["activity_indicators"]["alu2_write"]) {
    display_number_on_leds("alu_write_leds",1)
  } else {
    display_number_on_leds("alu_write_leds",0)
  }

  display_number_on_leds("alu_read_leds",front_panel_info["activity_indicators"]["alu_read"])

  display_number_on_leds("ram_addr_leds", front_panel_info["activity_indicators"]["ram_address"])
  display_number_on_leds("ram_write_leds", front_panel_info["activity_indicators"]["ram_write"])
  display_number_on_leds("ram_read_leds", front_panel_info["activity_indicators"]["ram_read"])
  display_number_on_leds("ram_offset_leds", front_panel_info["activity_indicators"]["ram_frame_offset"])
  display_number_on_leds("ram_addr_mode_leds", front_panel_info["ram_addr_mode"])

  display_number_on_leds("rom_addr_leds", front_panel_info["activity_indicators"]["rom_address"])
  display_number_on_leds("rom_read_leds", front_panel_info["activity_indicators"]["rom_read"])
  display_number_on_leds("rom_write_leds", front_panel_info["activity_indicators"]["rom_write"])
}

function draw_screen_updates() {
  var img_data = canvas_context.createImageData(16,1)

  while (vram_changes_buffer.length > 0) {
    var item = vram_changes_buffer.pop()
    var address = item[0]
    var word = item[1]
    var y = Math.floor(address / 8)
    var x = (address % 8) * 16
    var value

    for (var i = 0; i < img_data.data.length; i += 4) {
      var mask = 1 << (15 - (i/4))

      if ((word & mask) != 0) {
        value = pixel_on_colour
      } else {
        value = pixel_off_colour
      }
      img_data.data[i]     = value
      img_data.data[i + 1] = value
      img_data.data[i + 2] = value
      img_data.data[i + 3] = 255
    }
    canvas_context.putImageData(img_data,x,y)
  }
}

function on_key_event(event, mode) {
  if (!updates_running || event.target !== document.body) {
    return
  }

  event.preventDefault()

  var key_name = event.code
  var scancodes = keycode_to_scancode[key_name]

  if (scancodes === undefined) {
    console.warn("Can't find scancodes for key '" + key_name + "'")
  } else {
    var codes = []

    if (mode === "keydown") {
      codes = scancodes[0]
    } else if (mode === "keyup") {
      codes = scancodes[1]
    }
    worker.postMessage(["key_code",codes])
  }
}
