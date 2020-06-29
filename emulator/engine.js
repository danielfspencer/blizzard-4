init_memory()
init_rom()
init_emulator()

function init_memory() {
  //system buses
  write_bus = 0
  data_bus = 0
  read_bus = 0

  //control unit registers
  program_counter = 32768  // 1st word of ROM
  micro_program_counter = 0
  command_word = 0
  control_mode = 0
  arg_regs = [0,0,0]

  //memory spaces
  ram  = create_zeroed_array(1024 * 16) //16k x 16 bit (32KB)
  stack_pointer = 0
  //rom is done separately
  vram = create_zeroed_array(1024 * 1) // 1k x 16 bit (2KB)

  //256 x 8 bit FIFO buffer for key presses
  key_fifo = [0xAA]  //0xaa means keyobard self test OK

  //other registers
  alu_operands = [0,0]
  user_input = [0,0]
  user_output = [0,0,0]
}

function init_rom() {
  rom  = create_zeroed_array(1024 * 32) //32k x 16 bit (64KB)
  write_protect = false
}

function create_zeroed_array(length) {
  let array = Array(length).fill(0)
  return array
}

function init_emulator() {
  debug = false
  is_running = false
  total_cycles = 0
  total_instructions = 0
  max_stack_pointer = 0
  temp_cycles = 0
  actual_cycles_per_second = 0
  target_cycles_per_second = 0
  cycles_per_batch = 0
  vram_addresses_changed = {}
  ram_addresses_changed = {}

  cycle_count_when_timer_last_reset = 0

  init_activity_indicators()
}

function init_activity_indicators() {
  activity_indicators = {
    alu1_write:0,
    alu2_write:0,
    alu_read:0,
    ram_address:0,
    ram_read:0,
    ram_write:0,
    ram_frame_offset:0,
    rom_address:0,
    rom_read:0,
    rom_write:0,
    vram_address:0,
    vram_read:0,
    vram_write: 0
  }
}

//control unit microcode
const load_fetch_microcode = [
  [1,0,1,0,0,0,1,0],
  [1,0,0,1,0,0,1,0],
  [1,0,0,0,1,0,1,1],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [1,0,1,0,0,0,1,0],
  [1,0,0,1,0,0,1,0],
  [1,0,0,0,0,1,0,0],
  [0,1,0,0,1,0,1,1],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [1,0,1,0,0,0,1,0],
  [1,0,0,0,0,1,0,0],
  [0,1,0,1,0,0,1,0],
  [1,0,0,0,1,0,1,1],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [1,0,1,0,0,0,1,0],
  [1,0,0,0,0,1,0,0],
  [0,1,0,1,0,0,1,0],
  [1,0,0,0,0,1,0,0],
  [0,1,0,0,1,0,1,1],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0]
]

const execute_microcode = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,1],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,1,0,0,0,0,1,0,0],
  [0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
]

onmessage = (event) => {
  let message = event.data
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
          if (strings_as_array[i] == "") {
            break
          }
          var number = parseInt(strings_as_array[i],2)
          if (number >= 0 && number <= 0xffff) {
            rom[i] = number
          } else {
            console.error(`Illegal ROM input '${strings_as_array[i]}', word ${i}`)
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
      stop()
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
    case "write_protect_change":
      write_protect = message[1]
      break
    default:
      console.error(`Unknown command '${message[0]}'`)
      break
  }
}

function measure_frequency() {
  actual_cycles_per_second = temp_cycles * 10
  temp_cycles = 0
}

function send_front_panel_info() {
  var data = {
    clock_speed: actual_cycles_per_second,
    program_counter:  program_counter,
    stack_pointer: stack_pointer,
    command_word: command_word,
    control_mode: control_mode,
    arg_regs: arg_regs,
    user_output: user_output,
    write_bus: write_bus,
    data_bus: data_bus,
    read_bus: read_bus,
    alu_operands: alu_operands,
    activity_indicators: activity_indicators,
    micro_program_counter: micro_program_counter
  }
  postMessage(["front_panel_info",data])
}

function send_vram_changes() {
  //vram_addresses_changed stores the addresses that have been changed as keys - this is because testing for
  //the existance of a key is much faster than array.includes()

  let vram_changes_buffer = []
  for (const address in vram_addresses_changed) {
    let data = vram[address]
    vram_changes_buffer.push([address,data])
  }
  postMessage(["vram_changes",vram_changes_buffer])
  vram_addresses_changed = {}
  send_ram_changes()
}

function send_ram_changes() {
  let ram_changes_buffer = []
  for (const address in ram_addresses_changed) {
    let data = ram[address]
    ram_changes_buffer.push([address,data])
  }
  postMessage(["ram_changes",ram_changes_buffer])
  ram_addresses_changed = {}
}

function vram_change(address, new_data) {
  activity_indicators.vram_write = 1
  vram[address] = new_data
  if (vram_addresses_changed[address] === undefined) {
    vram_addresses_changed[address] = true
  }
}

function ram_change(address, new_data) {
  activity_indicators.ram_write = 1
  ram[address] = new_data
  if (ram_addresses_changed[address] === undefined) {
    ram_addresses_changed[address] = true
  }
}

function get_timer_value() {
  let cycles = total_cycles - cycle_count_when_timer_last_reset
  let time_sec = cycles / actual_cycles_per_second
  let value = time_sec * 8192   // 8192 counts per second

  let low_word = value & 0xffff
  let high_word = (value >> 16) & 0xffff

  return [low_word,high_word]
}

function reset_timer() {
  cycle_count_when_timer_last_reset = total_cycles
}

function start() {
  if (!is_running) {
    debug = false
    is_running = true
    //set a timer to run the calculated number of cycles every 10ms that will equate to the target_cycles_per_second
    interval_timer = setInterval(() => { run_batch(cycles_per_batch) }, 10)
    frequency_measurement_timer = setInterval(measure_frequency, 100)
    postMessage(["started"])
  }
}

function stop() {
  if (is_running) {
    is_running = false
    zero_busses()
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
  debug && console.debug("---clock rising edge:")
  debug && console.debug(` ↳ control mode: ${control_mode.toString()}`)

  debug && console.debug("---running read_clock microcode:")
  //run contol unit commands that modify (directly or indirectly) the data bus
  if (control_mode === 0) {
    var instructions = get_load_fetch_microcode_instructions()
    run_load_fetch_microcode(instructions, true)
  } else {
    var instructions = get_execute_microcode_instructions()
    run_execute_microcode(instructions, true)
  }

  debug && console.debug("---new state:")
  debug && console.debug(` ↳ read bus: ${read_bus}`)
  debug && console.debug(` ↳ data bus: ${data_bus}`)
  debug && console.debug(` ↳ write bus: ${write_bus}`)

  //simulate read bus if it has been used
  debug && console.debug(`simulating read bus with content: ${read_bus}`)
  if (read_bus !== 0) {
    simulate_effect_of_read_bus_change()
  }

  micro_program_counter++

  debug && console.debug("---running data bus-dependant microcode: ")
  //run control unit commands that depend (directly or indirectly) on the data bus
  if (control_mode === 0) { //the control unit is in execute mode
    run_load_fetch_microcode(instructions, false)
  } else {
    run_execute_microcode(instructions, false)
  }

  debug && console.debug("---new state:")
  debug && console.debug(` ↳ read bus: ${read_bus}`)
  debug && console.debug(` ↳ data bus: ${data_bus}`)
  debug && console.debug(` ↳ write bus: ${write_bus}`)

  //simulate write bus
  debug && console.debug(`simulating write bus with content: ${write_bus}`)
  if (write_bus !== 0) {
    simulate_effect_of_write_bus_change()
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
    activity_indicators.rom_read = 1
    activity_indicators.rom_address = address
    data_bus = rom[address]

  } else if (read_bus > 16383) {                                          // RAM
    activity_indicators.ram_read = 1

    var address = read_bus - 16384
    data_bus = ram[address]
    activity_indicators.ram_address = address

  } else if (read_bus < 16384) {                                          //everywhere else (card addressing)
    var card_address = (read_bus & 0b0011100000000000) >> 11
    var address = read_bus & 0b0000011111111111

    switch (card_address) {                                               //control unit + timer + alu
      case 0:
        switch (address) {
          case 2:
            data_bus = stack_pointer
            break
          case 3:
            data_bus = get_timer_value()[0]
            break
          case 4:
            data_bus = get_timer_value()[1]
          default:
            switch (address - 8) {
              case 2:
                data_bus = alu_operands[0] + alu_operands[1]
                activity_indicators.alu_read = 2 ** 10
                break
              case 3:
                data_bus = alu_operands[0] - alu_operands[1]
                activity_indicators.alu_read = 2 ** 9
                break
              case 4:
                data_bus = alu_operands[0] >> 1
                activity_indicators.alu_read = 2 ** 8
                break
              case 5:
                data_bus = alu_operands[0] << 1
                activity_indicators.alu_read = 2 ** 7
                break
              case 6:
                data_bus = alu_operands[0] & alu_operands[1]
                activity_indicators.alu_read = 2 ** 6
                break
              case 7:
                data_bus = alu_operands[0] | alu_operands[1]
                activity_indicators.alu_read = 2 ** 5
                break
              case 8:
                data_bus = alu_operands[0] ^ 0xffff
                activity_indicators.alu_read = 2 ** 4
                break
              case 9:
                data_bus = alu_operands[0] > alu_operands[1] ? 1 : 0
                activity_indicators.alu_read = 2 ** 3
                break
              case 10:
                data_bus = alu_operands[0] < alu_operands[1] ? 1 : 0
                activity_indicators.alu_read = 2 ** 2
                break
              case 11:
                data_bus = alu_operands[0] === alu_operands[1] ? 1 : 0
                activity_indicators.alu_read = 2
                break
              case 12:
                data_bus = (alu_operands[0] + alu_operands[1]) > 0xffff ? 1 : 0
                activity_indicators.alu_read = 1
                break
              default:
                break
            }
            data_bus = data_bus & 0xffff
        }
        break
      case 1:                                                             //stack
        let abs_address = stack_pointer + address
        data_bus = ram[abs_address]
        activity_indicators.ram_address = abs_address
        activity_indicators.ram_read = 1
        break
      case 2:                                                             //user io
        switch (address) {
          case 0: // input switches
          case 1:
          case 2:
            data_bus = user_input[address]
            break
          case 6: // keyboard fifo
            if (key_fifo.length > 0) {
              data_bus = key_fifo.shift()
            } else {
              data_bus = 0
            }
            break
          default:
            break
        }
        if (address < 3) {
          data_bus = user_input[address]
        }
        break
      case 3:                                                             //video adapter
        if (address < 1024) {
          data_bus = vram[address]
          activity_indicators.vram_read = 1
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
    activity_indicators.rom_write = 1
    activity_indicators.rom_address = address
    if (!write_protect) {
      rom[address] = data_bus
    }

  } else if (write_bus > 16383) {                                          // RAM
    let address = write_bus - 16384

    if (address < 0 || address > 16383) {
      halt_error("invalid address for ram")
    }

    ram_change(address, data_bus)
    activity_indicators.ram_address = address

  } else if (write_bus < 16384) {                                          //everywhere else (card addressing)
    var card_address = (write_bus & 0b0011100000000000) >> 11
    var address = write_bus & 0b0000011111111111

    switch (card_address) {                                               //control unit
      case 0:
        switch (address) {
          case 2:
            stack_pointer = data_bus & 0b11111111111111
            if (stack_pointer > max_stack_pointer) {
              max_stack_pointer = stack_pointer
            }
            break
          case 3:
            reset_timer()
            break
          case 8:
            alu_operands[0] = data_bus
            activity_indicators.alu1_write = 1
            break
          case 9:
            alu_operands[1] = data_bus
            activity_indicators.alu2_write = 1
            break
          default:
            break
        }
        break
      case 1:                                                             //stack
      let abs_address = stack_pointer + address
        ram[abs_address] = data_bus
        ram_change(abs_address, data_bus)
        activity_indicators.ram_address = abs_address
        activity_indicators.ram_write = 1
        break
      case 2:                                                             //user io
        if (address < 6 && address > 2) {
          user_output[address - 3] = data_bus
        }
        break
      case 3:                                                             //video adapter
        if (address < 1024) {
          vram_change(address, data_bus)
        }
        break
      default:
        break
    }
  }
}

function get_load_fetch_microcode_instructions() {
  let addr_mode = (command_word & 0b1100000000000) >> 8
  let address = addr_mode + micro_program_counter
  let instructions = load_fetch_microcode[address]

  debug && console.debug(`load/fetch microcode[${get_padded_num(address,5,2)}]`)

  if (instructions === undefined) {
    halt_error("Invalid adddress for load/fetch microcode")
  }
  return instructions
}

function get_execute_microcode_instructions() {
  //needs attention
  let opcode = (command_word & 0b1110000000000000) >> 11
  let address = opcode + micro_program_counter
  let instructions = execute_microcode[address]

  debug && console.debug(`execute microcode[${get_padded_num(address,5,2)}]`)

  if (instructions === undefined) {
    halt_error("Invalid adddress for execute microcode")
  }
  return instructions
}

function run_load_fetch_microcode(instructions, read_clock) {
  debug && console.debug(`running instructions: ${JSON.stringify(instructions)}`)

  if (read_clock) {
    instructions[0] && micro_instructions.read_clock.pc_to_read_bus()
    instructions[1] && micro_instructions.read_clock.arg3_to_read_bus()
  } else {
    instructions[2] && micro_instructions.write_clock.data_bus_to_cmd_reg()
    instructions[3] && micro_instructions.write_clock.data_bus_to_arg1()
    instructions[4] && micro_instructions.write_clock.data_bus_to_arg2()
    instructions[5] && micro_instructions.write_clock.data_bus_to_arg3()
    instructions[6] && micro_instructions.neither.increment_pc()
    instructions[7] && micro_instructions.neither.increment_mode()
  }
}

function run_execute_microcode(instructions, read_clock) {
  debug && console.debug(`running instructions: ${JSON.stringify(instructions)}`)

  if (read_clock) {
    instructions[0] && micro_instructions.read_clock.arg1_to_data_bus()
    instructions[1] && micro_instructions.read_clock.arg1_to_read_bus()
    instructions[2] && micro_instructions.read_clock.arg2_to_data_bus()
    instructions[3] && micro_instructions.read_clock.arg3_to_data_bus()
    instructions[4] && micro_instructions.read_clock.arg2_arg3_to_data_bus()
    instructions[5] && micro_instructions.read_clock.stack_pointer_ref_to_read_bus()
    instructions[6] && micro_instructions.read_clock.pc_to_data_bus()
  } else {
    instructions[7]  && micro_instructions.write_clock.stack_pointer_ref_to_write_bus()
    instructions[8]  && micro_instructions.write_clock.stack_word1_to_write_bus()
    instructions[9]  && micro_instructions.write_clock.stack_word2_to_write_bus()
    instructions[10] && micro_instructions.write_clock.arg2_to_write_bus()
    instructions[11] && micro_instructions.write_clock.data_bus_to_arg3()
    instructions[12] && micro_instructions.neither.arg1_to_pc_cond()
    instructions[13] && micro_instructions.neither.arg1_to_pc_uncond()
    instructions[14] && micro_instructions.neither.stop_clock()
    instructions[15] && micro_instructions.neither.increment_mode()
  }
}

const micro_instructions = {
  read_clock: {
    pc_to_read_bus: () => {
      debug && console.debug("pc -> read bus")
      read_bus = program_counter
    },
    arg3_to_read_bus: () => {
      debug && console.debug("arg3 -> read bus")
      read_bus = arg_regs[2]
    },
    arg1_to_data_bus: () => {
      debug && console.debug("arg1 -> data bus")
      data_bus = arg_regs[0]
    },
    arg1_to_read_bus: () => {
      debug && console.debug("arg1 -> read bus")
      read_bus = arg_regs[0]
    },
    arg2_to_data_bus: () => {
      debug && console.debug("arg2 -> data bus")
      data_bus = arg_regs[1]
    },
    arg3_to_data_bus: () => {
      debug && console.debug("arg3 -> data bus")
      data_bus = arg_regs[2]
    },
    arg2_arg3_to_data_bus: () => {
      debug && console.debug("arg2 + arg3 -> data bus")
      data_bus = arg_regs[1] + arg_regs[2]
    },
    stack_pointer_ref_to_read_bus: () => {
      debug && console.debug("#ctl.sp -> read bus")
      read_bus = 2
    },
    pc_to_data_bus: () => {
      debug && console.debug("pc -> data bus")
      data_bus = program_counter
    },
  },
  write_clock: {
    data_bus_to_cmd_reg: () => {
      debug && console.debug("data bus -> command reg")
      command_word = data_bus
    },
    data_bus_to_arg1: () => {
      debug && console.debug("data bus -> arg1")
      arg_regs[0] = data_bus
    },
    data_bus_to_arg2: () => {
      debug && console.debug("data bus -> arg2")
      arg_regs[1] = data_bus
    },
    data_bus_to_arg3: () => {
      debug && console.debug("data bus -> arg3")
      arg_regs[2] = data_bus
    },
    stack_pointer_ref_to_write_bus: () => {
      debug && console.debug("#ctl.sp -> write bus")
      write_bus = 2
    },
    stack_word1_to_write_bus: () => {
      debug && console.debug("#stack.0 -> write bus")
      write_bus = 2048
    },
    stack_word2_to_write_bus: () => {
      debug && console.debug("#stack.1 -> write bus")
      write_bus = 2049
    },
    arg2_to_write_bus: () => {
      debug && console.debug("arg2 -> write bus")
      write_bus = arg_regs[1]
    }
  },
  neither: {
    increment_pc: () => {
      debug && console.debug("increment pc")
      program_counter++
      program_counter = program_counter & 0xffff
    },
    increment_mode: () => {
      debug && console.debug("increment mode")
      control_mode++
      control_mode &= 1
      total_instructions += 0.5
      micro_program_counter = 0
    },
    arg1_to_pc_uncond: () => {
      debug && console.debug("arg 1 -> pc")
      program_counter = arg_regs[0]
    },
    arg1_to_pc_cond: () => {
      debug && console.debug("arg 1 -> pc [if arg 2 LSB = 0]")
      if ((arg_regs[1] & 1) == 0) {
        program_counter = arg_regs[0]
      }
    },
    stop_clock: () => {
      debug && console.debug("clock_stop")
      stop()
    }
  }
}
