let worker
let canvas_context
let led_strips = {}
let front_panel_info = {}
let updates_running = false
let vram_changes_buffer = []

$(document).ready(() => {
  parent.interface.funcs.clear_buttons()
  parent.interface.funcs.add_button(gen_button("memory.svg", "ram visualiser"), open_visualiser)
  // parent.interface.funcs.add_button(gen_button("stats.svg", "statistics"), open_stats)

  let canvas = document.getElementById("screen")
  canvas_context = canvas.getContext("2d")

  tools.storage.get_key("emulator-display-colour", set_screen_theme, "green-grey")

  worker = new Worker("engine.js")
  worker.onmessage = e => handle_message(e.data)

  document.addEventListener("keydown", e => on_key_event(e, "keydown"))
  document.addEventListener("keyup", e => on_key_event(e, "keyup"))

  $(".led_row").each((idx, element) => {
    led_strips[element.id] = get_led_references(element)
  })

  $("#start").click(() => {
    send_user_input()
    worker.postMessage(["start"])
  })

  $("#reset").click(() => {
    worker.postMessage(["reset"])
    worker.postMessage(["set_clock", $("#clock-target").val()])
    setTimeout(() => {
      clear_screen()
      let store = parent.interface.window_ref_store
      if (store.visualiser !== undefined) {
        store.visualiser.clear_screen()
      }
    }, 150)
    send_user_input()
  })

  $("#stop").click(() => worker.postMessage(["stop"]))

  $("#step").mousedown(() => worker.postMessage(["clock_high"]))

  $("#step, #read, #write, #copy").mouseup(() => worker.postMessage(["clock_low"]))

  $("#read").mousedown(() => worker.postMessage(["bus_read"]))

  $("#write").mousedown(() => worker.postMessage(["bus_write"]))

  $("#copy").mousedown(() => worker.postMessage(["bus_copy"]))

  $("#clock-target").change(() => {
    worker.postMessage(["set_clock", $("#clock-target").val()])
  })

  $("#usr1_input, #usr2_input, #usr3_input").on('input', send_user_input)

  $("#rom_write_protect").change(e => {
    worker.postMessage(["write_protect_change", $(e.target).prop('checked')])
  })

  worker.postMessage(["request_front_panel_info"])
  worker.postMessage(["set_clock", 100000])
  parent.interface.funcs.input_data = set_rom
  parent.interface.funcs.child_page_loaded()
})

function handle_message(message) {
  switch(message[0]) {
    case "front_panel_info":
      front_panel_info = message[1]
      if (!updates_running) {
        draw_front_panel()
      }
      break
    case "vram_changes":
      vram_changes_buffer.push(...message[1])
      break
    case "ram_changes":
      let store = parent.interface.window_ref_store
      if (store.visualiser !== undefined) {
        store.visualiser.ram_changes_buffer.push(...message[1])
      }
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
      console.error(`Unknown command '${message[0]}'`)
      break
  }
}

function gen_button(icon, text) {
  return `<img src='assets/icons/${icon}'/><a>${text}</a>`
}

function open_visualiser() {
  let store = parent.interface.window_ref_store
  if (store.visualiser === undefined || store.visualiser.parent === null) {
    windows.open('emulator/visualiser/visualiser.html', 512, 512 + 24, ref => {
      store.visualiser = ref
    })
  }
}

// function open_stats() {
//   let store = parent.interface.window_ref_store
//   if (store.stats === undefined || store.stats.parent === null) {
//     windows.open('emulator/stats/stats.html', 400, 136 + 24, ref => {
//       store.stats = ref
//     })
//   }
// }

function set_screen_theme(theme) {
  let mapping = {
    "white-black": [[255,255,255],[0,0,0]],
    "white-grey":  [[255,255,255],[21,21,21]],
    "black-white": [[0,0,0],[250,250,250]],
    "green-black": [[58,181,58],[0,0,0]],
    "green-grey":  [[58,181,58],[21,21,21]]
  }
  pixel_on_colours = mapping[theme][0]
  pixel_off_colours = mapping[theme][1]
  clear_screen()
}

function set_rom([string, shouldRun, clock_speed]) {
  if (clock_speed !== undefined) {
    $("#clock-target").val(clock_speed)
    worker.postMessage(["set_clock", clock_speed])
  }
  worker.postMessage(["set_rom", string])
  if (shouldRun) {
    worker.postMessage(["start"])
  }
}

function send_user_input(event){
  let inputs = [$("#usr1_input").val(), $("#usr2_input").val(), $("#usr3_input").val()]
  let sanitised_inputs = []
  for (const input of inputs) {
    let integer = parseInt(input)
    if (integer > 65535) {
      integer = 65535
    } else if (integer < 0) {
      integer = 0
    }
    sanitised_inputs.push(integer)
  }

  display_number_on_leds("inp1_leds", sanitised_inputs[0])
  display_number_on_leds("inp2_leds", sanitised_inputs[1])
  display_number_on_leds("inp3_leds", sanitised_inputs[2])
  worker.postMessage(["user_input_update", sanitised_inputs])
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
    step_timer = setInterval(() => slow_step(delay), delay)
  }
}

function stop_slow_step() {
  if (updates_running) {
    clearInterval(step_timer)
  }
  stop_updates()
}

function slow_step(delay) {
  worker.postMessage(["clock_high"])
  setTimeout(() => worker.postMessage(["clock_low"]), delay / 2)
}

function benchmark() {
  console.time("leds")
  for (let i = 0; i < 500000; i++) {
    display_number_on_leds("data_bus_leds",i % 65535)
  }
  console.timeEnd("leds")
}

function clear_screen() {
  let [red, green, blue] = pixel_off_colours
  canvas_context.fillStyle = `rgb(${red}, ${green}, ${blue})`
  canvas_context.fillRect(0, 0, 128, 128)
}

function get_led_references(element) {
  let references = {
    leds: Array.prototype.slice.call(element.children),
    value: 0,
    tooltip: null,
    tooltip_visible: false
  }

  // true if leds should have a tooltip
  if (element.children[0].className === "tooltip_content") {
    references.leds = references.leds.slice(1)
    references.tooltip = element.children[0]
    element.addEventListener("mouseover", mouseover_tooltip)
    element.addEventListener("mouseout", mouseoff_tooltip)
  }

  let log10_of_leds_squared = Math.log10(Math.pow(2, references.leds.length))
  references.num_dec_digits = Math.ceil(log10_of_leds_squared)
  references.num_hex_digits = Math.ceil(log10_of_leds_squared / Math.log10(16))

  return references
}

function display_number_on_leds(id, number) {
  let references = led_strips[id]
  let leds = references.leds

  for (let i = 0; i < leds.length; i++) {
    let mask = 1 << (leds.length - i - 1)
    let ref = leds[i].classList
    if ((number & mask) !== 0) {
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
  let references = led_strips[id]
  let dec = get_padded_num(references.value, references.num_dec_digits,10)
  let hex = get_padded_num(references.value , references.num_hex_digits,16)

  let text = `${dec} / 0x${hex}`
  references.tooltip.childNodes[0].nodeValue = text
}

function mouseover_tooltip() {
  let references = led_strips[this.id]
  if (updates_running) {
    references.tooltip_visible = true
  } else {
    update_tool_tip(this.id)
  }
}

function mouseoff_tooltip() {
  let references = led_strips[this.id]
  references.tooltip_visible = false
}

function get_padded_num(number,num_zeroes,base) {
  let string = number.toString(base)

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
  $("#clock-actual").val(front_panel_info.clock_speed)

  display_number_on_leds("alu1_leds", front_panel_info.alu_operands[0])
  display_number_on_leds("alu2_leds", front_panel_info.alu_operands[1])
  display_number_on_leds("read_bus_leds", front_panel_info.read_bus)
  display_number_on_leds("data_bus_leds", front_panel_info.data_bus)
  display_number_on_leds("write_bus_leds", front_panel_info.write_bus)

  display_number_on_leds("pc_leds", front_panel_info["program_counter"])

  let command_string = get_padded_num(front_panel_info.command_word,16,2)
  let first_part = parseInt(command_string.slice(0,5),2)
  display_number_on_leds("cmd_word_1st_part_leds", first_part)
  display_number_on_leds("micro_program_counter", front_panel_info.micro_program_counter)

  display_number_on_leds("proc_mode_leds", 2 - front_panel_info.control_mode)

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
  }

  display_number_on_leds("arg1_leds", front_panel_info.arg_regs[0])
  display_number_on_leds("arg3_leds", front_panel_info.arg_regs[2])
  display_number_on_leds("arg2_leds", front_panel_info.arg_regs[1])
  display_number_on_leds("out1_leds", front_panel_info.user_output[0])
  display_number_on_leds("out2_leds", front_panel_info.user_output[1])
  display_number_on_leds("out3_leds", front_panel_info.user_output[2])

  if (front_panel_info.activity_indicators.alu1_write) {
    display_number_on_leds("alu_write_leds",2)
  } else if (front_panel_info.activity_indicators.alu2_write) {
    display_number_on_leds("alu_write_leds",1)
  } else {
    display_number_on_leds("alu_write_leds",0)
  }

  display_number_on_leds("alu_read_leds",front_panel_info.activity_indicators.alu_read)

  display_number_on_leds("ram_write_leds", front_panel_info.activity_indicators.ram_write)
  display_number_on_leds("ram_read_leds", front_panel_info.activity_indicators.ram_read)
  display_number_on_leds("ram_addr_leds", front_panel_info.activity_indicators.ram_address)
  display_number_on_leds("stack_pointer_leds", front_panel_info.stack_pointer)

  display_number_on_leds("rom_addr_leds", front_panel_info.activity_indicators.rom_address)
  display_number_on_leds("rom_read_leds", front_panel_info.activity_indicators.rom_read)
  display_number_on_leds("rom_write_leds", front_panel_info.activity_indicators.rom_write)
}

function draw_screen_updates() {
  let img_data = canvas_context.createImageData(16, 1)

  for (const [address, word] of vram_changes_buffer) {
    let y = Math.floor(address / 8)
    let x = (address % 8) * 16

    for (let i = 0; i < img_data.data.length; i += 4) {
      let mask = 1 << (15 - (i/4))

      let [red, green, blue] = pixel_off_colours
      if ((word & mask) !== 0) {
        [red, green, blue] = pixel_on_colours
      }
      img_data.data[i]     = red
      img_data.data[i + 1] = green
      img_data.data[i + 2] = blue
      img_data.data[i + 3] = 255
    }
    canvas_context.putImageData(img_data, x, y)
  }

  vram_changes_buffer = []
}

function on_key_event(event, mode) {
  if (!updates_running || event.target !== document.body) {
    return
  }

  event.preventDefault()

  let key_name = event.code
  let scancodes = keycode_to_scancode[key_name]

  if (scancodes === undefined) {
    console.warn(`Can't find scancodes for key '${key_name}'`)
  } else {
    let codes

    if (mode === "keydown") {
      codes = scancodes[0]
    } else if (mode === "keyup") {
      codes = scancodes[1]
    }
    worker.postMessage(["key_code", codes])
  }
}
