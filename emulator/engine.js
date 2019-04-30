init_memory()
init_rom()
init_emulator()

function benchmark() {
  rom[0] = 0b1000000000000000
  rom[1] = 0b1010101010101010
  rom[2] = 0b0101010101010101
  rom[3] = 0b0100000000000000
  console.time("time")
  is_running = true
  run_batch(5000000)
  is_running = false
  console.timeEnd("time")
}

function init_memory() {
  //system buses
  write_bus = 0
  data_bus = 0
  read_bus = 0

  //control unit registers
  program_counter = 0
  command_word = 0
  control_mode = 0
  args_remaining = 0
  arg_regs = [0,0,0]
  conditional_bit = 0
  frame_number = 0

  //memory spaces
  ram  = create_zeroed_array(1024 * 16) //16k x 16 bit (32KB)
  //rom is done separately
  vram = create_zeroed_array(1024 * 1) // 1k x 16 bit (2KB)

  //256 x 8 bit FIFO buffer for key presses
  key_fifo = [0xAA]  //0xaa means keyobard self test OK

  //other registers
  alu_operands = [0,0]
  user_input = [0,0]
  user_output = [0,0,0]

  //misc controls
  direct_ram_addressing = false
}

function init_rom() {
  rom  = create_zeroed_array(1024 * 32) //32k x 16 bit (64KB)
}

function create_zeroed_array(length) {
  var array = []
  for (var i = 0; i < length; i++) {
    array.push(0)
  }
  return array
}

function init_emulator() {
  debug = false
  is_running = false
  first_clock = false //the clock is a one-two beat so first_clock is true when on the 'one' beat
  total_cycles = 0
  total_spare_cycles = 0
  temp_cycles = 0
  actual_cycles_per_second = 0
  target_cycles_per_second = 0
  cycles_per_batch = 0
  vram_addresses_changed = {}
  vram_changes_buffer = []

  init_activity_indicators()
  init_buffered_instructions()
}

function init_buffered_instructions() {
  buffered_instructions = {
    "increment_mode": false,
    "decrement_arg_counter": false,
    "clock_stop": false,
    "increment_frame_no": false
  }
}

function init_activity_indicators() {
  activity_indicators = {
    "alu1_write":0,
    "alu2_write":0,
    "alu_read":0,
    "ram_address":0,
    "ram_read":0,
    "ram_write":0,
    "ram_frame_offset":0,
    "rom_address":0,
    "rom_read":0,
    "rom_write":0,
    "vram_address":0,
    "vram_read":0,
    "vram_write": 0
  }
}

//control unit microcode
const load_fetch_microcode = [
  [0,0,1,1,0,0,0,0,0],
  [1,1,0,0,0,0,0,0,0],
  [0,0,1,1,0,0,0,0,0],
  [1,1,0,0,0,0,0,0,0],
  [0,0,1,1,0,0,0,0,0],
  [1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],
  [0,0,1,0,0,0,0,0,0],
  [0,0,0,1,1,0,1,0,1],
  [1,0,0,0,0,1,0,0,0],
  [0,0,0,1,1,0,1,1,0],
  [1,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0]
]

const execute_microcode = [
  [0,0,0,0,0,0,0,0,0,0,0,0],
  [1,0,0,0,0,0,0,0,0,0,0,1],
  [0,0,0,1,0,0,0,0,0,0,0,1],
  [0,1,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,0,0,0,0,0,1],
  [0,0,0,0,0,1,0,0,0,0,0,1],
  [0,0,1,0,1,0,0,0,0,0,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,1,0,1],
  [0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,0,1,0,1]
]

onmessage = function(event) {
  handle_message(event.data)
}

function handle_message(message) {
  switch (message[0]) {
    case "start":
      start()
      break
    case "stop":
      stop()
      break
    case "set_rom":
      //rom data is a string with lines breaks between the words
      var strings_as_array = message[1].split("\n")
      if (strings_as_array.length < rom.length) {
        for (var i = 0; i < strings_as_array.length; i++) {
          var number = parseInt(strings_as_array[i],2)
          if (number > 0 && number <= 0xffff) {
            rom[i] = parseInt(strings_as_array[i],2)
          }
        }
      } else {
        console.error("Program too large for ROM")
      }
      break
    case "clock_high":
      if (!is_running) {
        step_clock()
        send_front_panel_info()
        send_vram_changes()
        postMessage(["changed"])
      }
      break
    case "clock_low":
      if (!is_running) {
        zero_busses()
        send_front_panel_info()
        send_vram_changes()
        postMessage(["changed"])
      }
      break
    case "reset":
      if (is_running) {
        stop()
      }
      init_memory()
      init_emulator()
      send_front_panel_info()
      send_vram_changes()
      postMessage(["changed"])
      break
    case "request_front_panel_info":
      send_front_panel_info()
      break
    case "request_vram_changes":
      send_vram_changes()
      break
    case "user_input_update":
      user_input = message[1]
      break
    case "bus_read":
      if (!is_running) {
        read_bus = user_input[2]
        simulate_effect_of_read_bus_change()
        send_front_panel_info()
        send_vram_changes()
        postMessage(["changed"])
      }
      break
    case "bus_write":
      if (!is_running) {
        write_bus = user_input[0]
        data_bus = user_input[1]
        simulate_effect_of_write_bus_change()
        send_front_panel_info()
        send_vram_changes()
        postMessage(["changed"])
      }
      break
    case "bus_copy":
      if (!is_running) {
        write_bus = user_input[0]
        read_bus = user_input[2]
        simulate_effect_of_read_bus_change()
        simulate_effect_of_write_bus_change()
        send_front_panel_info()
        send_vram_changes()
        postMessage(["changed"])
      }
      break
    case "key_code":
      if (key_fifo.length < 256) {
        key_fifo.push.apply(key_fifo,message[1])
      }
      break
    case "set_clock":
      target_cycles_per_second = message[1]
      cycles_per_batch = Math.floor(target_cycles_per_second / 100)
      break
    case "benchmark":
      benchmark()
      break
    default:
      console.error("Unknown command '"+ message[0] +"'")
      break
  }
}

function measure_frequency() {
  actual_cycles_per_second = temp_cycles * 10
  temp_cycles = 0
}

function send_front_panel_info() {
  var data = {
    "clock_speed": actual_cycles_per_second,
    "program_counter":  program_counter,
    "command_word": command_word,
    "control_mode": control_mode,
    "args_remaining": args_remaining,
    "arg_regs": arg_regs,
    "conditional_bit": conditional_bit,
    "frame_number": frame_number,
    "user_output": user_output,
    "write_bus": write_bus,
    "data_bus": data_bus,
    "read_bus": read_bus,
    "alu_operands": alu_operands,
    "activity_indicators": activity_indicators
  }
  postMessage(["front_panel_info",data])
}

function send_vram_changes() {
  //vram_addresses_changed stores the addresses that have been changed as keys - this is because testing for
  //the existance of a key is much faster than array.includes()
  for (var address in vram_addresses_changed) {
    var data = vram[address]
    vram_changes_buffer.push([address,data])
  }
  postMessage(["vram_changes",vram_changes_buffer])
  vram_changes_buffer = []
  vram_addresses_changed = {}
}

function vram_change(address, new_data) {
  activity_indicators["vram_write"] = 1
  vram[address] = new_data
  if (vram_addresses_changed[address] === undefined) {
    vram_addresses_changed[address] = true
  }
}

function start() {
  if (!is_running) {
    debug = false
    is_running = true
    //set a timer to run the calculated number of cycles every 10ms that will equate to the target_cycles_per_second
    interval_timer = setInterval(function() {run_batch(cycles_per_batch)}, 10)
    frequency_measurement_timer = setInterval(measure_frequency, 100)
    postMessage(["started"])
  }
}

function stop() {
  if (is_running) {
    is_running = false
    clearInterval(interval_timer)
    clearInterval(frequency_measurement_timer)
    postMessage(["stopped"])
  } else {
    postMessage(["stop"])
  }
}

function halt_error(message) {
  console.error(message)
  stop()
}

function run_batch(cycles) {
  while (cycles-- >= 1 && is_running) {
    zero_busses()
    step_clock()
  }
}

function get_padded_num(number,num_zeroes,base) {
  var string = "0".repeat(num_zeroes)
  string += number.toString(base)
  return string.slice(-num_zeroes)
}

function step_clock() {
  first_clock = !first_clock
  debug && console.debug("---clock rising edge:")
  debug && console.debug(" ↳ is first clock? " + first_clock)
  debug && console.debug(" ↳ control mode: " + control_mode.toString())

  debug && console.debug("---running data bus-modifying microcode:")
  //run contol unit commands that modify (directly or indirectly) the data bus
  if (control_mode === 2) { //the control unit is in execute mode
    var instructions = get_execute_microcode_instructions()
    run_execute_microcode_1st_stage(instructions)
  } else {
    var instructions = get_load_fetch_microcode_instructions()
    run_load_fetch_microcode_1st_stage(instructions)
  }

  debug && console.debug("---new state:")
  debug && console.debug(" ↳ read bus: " + read_bus.toString())
  debug && console.debug(" ↳ data bus: " + data_bus.toString())
  debug && console.debug(" ↳ write bus: " + write_bus.toString())

  //simulate read bus if it has been used
  debug && console.debug("simulating read bus with content: " + read_bus.toString())
  if (read_bus !== 0) {
    simulate_effect_of_read_bus_change()
  }

  debug && console.debug("---running data bus-dependant microcode: ")
  //run control unit commands that depend (directly or indirectly) on the data bus
  if (control_mode === 2) { //the control unit is in execute mode
    run_execute_microcode_2nd_stage(instructions)
  } else {
    run_load_fetch_microcode_2nd_stage(instructions)
  }

  debug && console.debug("---new state:")
  debug && console.debug(" ↳ read bus: " + read_bus.toString())
  debug && console.debug(" ↳ data bus: " + data_bus.toString())
  debug && console.debug(" ↳ write bus: " + write_bus.toString())

  //simulate write bus
  debug && console.debug("simulating write bus with content: " + write_bus.toString())
  if (write_bus !== 0) {
    simulate_effect_of_write_bus_change()
  }

  debug && console.debug("---clock falling edge")
  run_buffered_instructions()

  if ((write_bus + read_bus + data_bus) == 0) {
    total_spare_cycles++
  }
  total_cycles++
  temp_cycles++
}

function zero_busses() {
  write_bus = 0
  read_bus = 0
  data_bus = 0

  init_activity_indicators()
}

function simulate_effect_of_read_bus_change() {

  if (data_bus !== 0) {
    halt_error("Data bus is not free for write - check microcode")
  }
  if (read_bus < 0 || read_bus > 65535) {
    halt_error("Read bus has an invalid value - check microcode")
  }

  if (read_bus > 32767) {                                                 // ROM
    var address = read_bus - 32768
    activity_indicators["rom_read"] = 1
    activity_indicators["rom_address"] = address
    data_bus = rom[address]

  } else if (read_bus > 16383) {                                          // RAM
    activity_indicators["ram_read"] = 1

    if (direct_ram_addressing) {
      var address = read_bus - 16384
      data_bus = ram[address]
    } else {
      var frame_offset_selector = (read_bus & 0b0011000000000000) >> 12
      var address = read_bus & 0b0000001111111111

      switch (frame_offset_selector) {
        case 0:   //frame below
          address += (frame_number - 1) * 1024
          activity_indicators["ram_frame_offset"] = 1
          break
        case 1:   //current frame
          address += frame_number * 1024
          activity_indicators["ram_frame_offset"] = 2
          break
        case 2:   //frame above
          address += (frame_number + 1) * 1024
          activity_indicators["ram_frame_offset"] = 4
          break
        default:
          halt_error("invalid frame offset requested")
          break
      }

      if (address < 0) {
        halt_error("invalid address for ram")
      } else {
        data_bus = ram[address]
      }
    }
    activity_indicators["ram_address"] = address

  } else if (read_bus < 16384) {                                          //everywhere else (card addressing)
    var card_address = (read_bus & 0b0011100000000000) >> 11
    var address = read_bus & 0b0000011111111111

    switch (card_address) {                                               //control unit
      case 0:
        data_bus = conditional_bit // read from cnd bit is required for != test
        break
      case 1:                                                             //alu

        switch (address) {
          case 2:
            data_bus = alu_operands[0] + alu_operands[1]
            activity_indicators["alu_read"] = 2 ** 10
            break
          case 3:
            data_bus = alu_operands[0] - alu_operands[1]
            activity_indicators["alu_read"] = 2 ** 9
            break
          case 4:
            data_bus = alu_operands[0] >> 1
            activity_indicators["alu_read"] = 2 ** 8
            break
          case 5:
            data_bus = alu_operands[0] << 1
            activity_indicators["alu_read"] = 2 ** 7
            break
          case 6:
            data_bus = alu_operands[0] & alu_operands[1]
            activity_indicators["alu_read"] = 2 ** 6
            break
          case 7:
            data_bus = alu_operands[0] | alu_operands[1]
            activity_indicators["alu_read"] = 2 ** 5
            break
          case 8:
            data_bus = alu_operands[0] ^ 0xffff
            activity_indicators["alu_read"] = 2 ** 4
            break
          case 9:
            data_bus = alu_operands[0] > alu_operands[1] ? 1 : 0
            activity_indicators["alu_read"] = 2 ** 3
            break
          case 10:
            data_bus = alu_operands[0] < alu_operands[1] ? 1 : 0
            activity_indicators["alu_read"] = 2 ** 2
            break
          case 11:
            data_bus = alu_operands[0] == alu_operands[1] ? 1 : 0
            activity_indicators["alu_read"] = 2
            break
          case 12:
            data_bus = (alu_operands[0] + alu_operands[1]) > 0xffff ? 1 : 0
            activity_indicators["alu_read"] = 1
            break
          default:
            break
        }

        data_bus = data_bus & 0xffff
        break
      case 2:                                                             //user io
        if (address < 3) {
          data_bus = user_input[address]
        }
        break
      case 3:                                                             //video adapter
        if (address < 1024) {
          data_bus = vram[address]
          activity_indicators["vram_read"] = 1
        }
        break
      case 4:                                                             //keyboard interface

        switch (address) {
          case 0:
            if (key_fifo.length > 0) {
              data_bus = key_fifo.shift()
            } else {
              data_bus = 0
            }
            break
          case 1:
            data_bus = key_fifo.length
            break
          default:
            break
        }
        break
      default:
        break
    }
  }

  if (data_bus === undefined) {
    halt_error("read-bus change gave data bus an invalid value")
  }
}

function simulate_effect_of_write_bus_change() {
  if (write_bus < 0 || write_bus > 65535) {
    halt_error("Write bus has an invalid value - check microcode")
  }

  if (write_bus > 32767) {                                                 // ROM
    var address = write_bus - 32768
    activity_indicators["rom_write"] = 1
    activity_indicators["rom_address"] = address
    rom[address] = data_bus

  } else if (write_bus > 16383) {                                          // RAM
    activity_indicators["ram_write"] = 1

    if (direct_ram_addressing) {
      var address = write_bus - 16384
      ram[address] = data_bus
    } else {
      var frame_offset_selector = (write_bus & 0b0011000000000000) >> 12
      var address = write_bus & 0b0000001111111111

      switch (frame_offset_selector) {
        case 0:   //frame below
          address += (frame_number - 1) * 1024
          activity_indicators["ram_frame_offset"] = 1
          break
        case 1:   //current frame
          address += frame_number * 1024
          activity_indicators["ram_frame_offset"] = 2
          break
        case 2:   //frame above
          address += (frame_number + 1) * 1024
          activity_indicators["ram_frame_offset"] = 4
          break
        default:
          halt_error("invalid frame offset requested")
          break
      }

      if (address < 0) {
        halt_error("invalid address for ram")
      } else {
        ram[address] = data_bus
      }
    }
    activity_indicators["ram_address"] = address

  } else if (write_bus < 16384) {                                          //everywhere else (card addressing)
    var card_address = (write_bus & 0b0011100000000000) >> 11
    var address = write_bus & 0b0000011111111111

    switch (card_address) {                                               //control unit
      case 0:
        conditional_bit = data_bus & 0b0000000000000001
        break
      case 1:                                                             //alu
        if (address == 0) {
          alu_operands[0] = data_bus
          activity_indicators["alu1_write"] = 1
        } else if (address == 1) {
          alu_operands[1] = data_bus
          activity_indicators["alu2_write"] = 1
        }
        break
      case 2:                                                             //user io
        if (address < 6 && address > 2) {
          user_output[address - 3] = data_bus
        }
        break
      case 3:                                                             //video adapter
        if (address < 1024) {
          vram_change(address, data_bus)
          activity_indicators["vram_write"] = 1
        }
        break
      case 4:                                                             //keyboard interface
        break
      default:
        break
    }
  }
}

function get_load_fetch_microcode_instructions() {
  var exe_mode = control_mode << 3
  var arg_count = args_remaining << 1
  var clock = first_clock ? 1 : 0
  var address = exe_mode + arg_count + clock
  var instructions = load_fetch_microcode[address]

  if (instructions === undefined) {
    halt_error("Invalid adddress for microcode")
  }

  debug && console.debug("load/fetch microcode address: " + get_padded_num(address,4,2))
  debug && console.debug(" ↳ instructions: " + JSON.stringify(instructions))
  return instructions
}

function get_execute_microcode_instructions() {
  var opcode = command_word >> 13
  var clock = first_clock ? 1 : 0
  var address = (opcode << 1)  + clock
  var instructions = execute_microcode[address]

  if (instructions === undefined) {
    halt_error("Invalid adddress for microcode")
  }

  debug && console.debug("execute microcode address: " + get_padded_num(address,4,2))
  debug && console.debug(" ↳ instructions: " + JSON.stringify(instructions))
  return instructions
}

function run_load_fetch_microcode_1st_stage(instructions) {
  debug && console.debug("running instructions: " + JSON.stringify(instructions))

  instructions[0] && pc_to_read_bus()
  instructions[2] && increment_mode()
  instructions[3] && increment_pc()
  instructions[4] && decrement_arg_counter()
  instructions[6] && arg3_to_selected_bus()
}

function run_load_fetch_microcode_2nd_stage(instructions) {
  debug && console.debug("running instructions: " + JSON.stringify(instructions))

  instructions[1] && data_bus_to_cmd_reg()
  instructions[5] && data_bus_to_arg3()
  instructions[7] && data_bus_to_arg1()
  instructions[8] && data_bus_to_arg2()
}

function run_execute_microcode_1st_stage(instructions) {
  debug && console.debug("running instructions: " + JSON.stringify(instructions))

  if (conditional_bit && (command_word & 1) == 1) {
    debug && console.log("execute disabled due to cnd bit")
    increment_mode()
    return
  }

  instructions[0]  && clock_stop()
  instructions[1]  && ram_caller_pointer_to_read_bus()
  instructions[5]  && arg2_to_pc()
  instructions[6]  && arg1_to_data_bus()
  instructions[7]  && arg1_to_read_bus()
  instructions[10] && pc_to_data_bus()
  instructions[11] && increment_mode()
}

function run_execute_microcode_2nd_stage(instructions) {
  debug && console.debug("running instructions: " + JSON.stringify(instructions))

  instructions[2] && ram_caller_pointer_to_write_bus()
  instructions[3] && decrement_frame_no()
  instructions[4] && increment_frame_no()
  instructions[8] && data_bus_to_pc()
  instructions[9] && arg2_to_write_bus()
}

function run_buffered_instructions() {
  if (buffered_instructions["increment_mode"]) {
    debug && console.debug("increment_mode")
    first_clock = false
    if (control_mode < 2) {
      control_mode++
    } else {
      control_mode = 0
    }
  }

  if (buffered_instructions["decrement_arg_counter"]) {
    debug && console.debug("decrement_arg_counter")
    args_remaining--
  }

  if (buffered_instructions["clock_stop"]) {
    debug && console.debug("clock_stop")
    stop()
  }

  if (buffered_instructions["increment_frame_no"]) {
    debug && console.debug("increment_frame_no")
    if (frame_number < 15) {
      frame_number++
    } else {
      frame_number = 0
    }
  }

  init_buffered_instructions() //this sets them all to false because we are finished
}

//--------------------microcode instructions

//arg reg
function arg1_to_read_bus() {
  debug && console.debug("arg1_to_read_bus")
  read_bus = arg_regs[0]
}

function arg1_to_data_bus() {
  debug && console.debug("arg1_to_data_bus")
  data_bus = arg_regs[0]
}

function arg2_to_pc() {
  debug && console.debug("arg2_to_pc")
  program_counter = arg_regs[1] & 0b0111111111111111
}

function arg2_to_write_bus() {
  debug && console.debug("arg2_to_write_bus")
  write_bus = arg_regs[1]
}

function arg3_to_selected_bus() {
  debug && console.debug("arg3_to_selected_bus")

  var addr_modes = (command_word & 0b0001100000000000) >> 11
  var addr_mode = 0
  if (args_remaining == 2) {
    addr_mode = (addr_modes & 0b01)
  } else if (args_remaining == 1) {
    addr_mode = (addr_modes & 0b10) >> 1
  }

  if (addr_mode) {
    read_bus = arg_regs[2]
  } else {
    data_bus = arg_regs[2]
  }
}

function data_bus_to_arg3() {
  debug && console.debug("data_bus_to_arg3")
  arg_regs[2] = data_bus
}

function data_bus_to_arg1() {
  debug && console.debug("data_bus_to_arg1")
  arg_regs[0] = data_bus
}

function data_bus_to_arg2() {
  debug && console.debug("data_bus_to_arg2")
  arg_regs[1] = data_bus
}

//other

function increment_mode() {
  debug && console.debug("queue: increment_mode")
  buffered_instructions["increment_mode"] = true
}

function increment_pc() {
  debug && console.debug("increment_pc")
  program_counter++
}

function decrement_arg_counter() {
  debug && console.debug("queue: decrement_arg_counter")
  buffered_instructions["decrement_arg_counter"] = true
}

function clock_stop() {
  debug && console.debug("queue: clock_stop")
  buffered_instructions["clock_stop"] = true
}

function pc_to_data_bus() {
  debug && console.debug("pc_to_data_bus")
  data_bus = program_counter + 32768
}

function data_bus_to_cmd_reg() {
  debug && console.debug("data_bus_to_cmd_reg")
  command_word = data_bus
  args_remaining = command_word >> 14
}

function pc_to_read_bus() {
  debug && console.debug("pc_to_read_bus")
  read_bus = program_counter + 32768
}

function ram_caller_pointer_to_read_bus() {
  debug && console.debug("ram_caller_pointer_to_read_bus")
  //this address is ram.1023
  read_bus = 0b0101001111111111
}

function ram_caller_pointer_to_write_bus() {
  debug && console.debug("ram_caller_pointer_to_write_bus")
  //this address is ram+.1023
  write_bus = 0b0110001111111111
}

function decrement_frame_no() {
  debug && console.debug("decrement_frame_no")
  if (frame_number > 0) {
    frame_number--
  } else {
    frame_number = 15
  }
}

function increment_frame_no() {
  debug && console.debug("queue: increment_frame_no")
  buffered_instructions["increment_frame_no"]  = true
}

function data_bus_to_pc() {
  debug && console.debug("data_bus_to_pc")
  program_counter = data_bus & 0b0111111111111111
}
