let ram  = create_zeroed_array(1024 * 48) // 48k x 16 bit (96KB)

function init_state() {
  //system buses
  write_bus = 0
  data_bus = 0
  read_bus = 0

  //control unit registers
  program_counter = 0x4000  // 1st word of RAM
  stack_pointer = 0
  micro_program_counter = 0
  command_word = 0
  control_mode = 0
  arg_regs = [0,0,0]

  //memory spaces
  vram = create_zeroed_array(1024 * 1) // 1k x 16 bit (2KB)

  //256 x 8 bit FIFO buffer for key presses
  key_fifo = [0xAA]  //0xaa means keyobard self test OK

  //other registers
  alu_operands = [0,0]
  user_input = [0,0]
  user_output = [0,0,0]

  // emulator values
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

function create_zeroed_array(length) {
  let array = Array(length).fill(0)
  return array
}

function init_activity_indicators() {
  activity_indicators = {
    alu1_write:0,
    alu2_write:0,
    alu_read:0,
    ram_address:0,
    ram_read:0,
    ram_write:0,
    vram_address:0,
    vram_read:0,
    vram_write: 0
  }
}

//control unit microcode
const load_fetch_microcode = [
  [0,1,0,0,0,0,1,0],
  [0,1,0,1,0,1,1,0],
  [0,1,1,0,1,0,1,1],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [0,1,0,0,0,0,1,0],
  [0,1,0,1,0,1,1,0],
  [0,1,1,1,1,0,0,0],
  [1,0,1,0,0,0,1,1],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [0,1,0,0,0,0,1,0],
  [0,1,1,1,0,1,0,0],
  [1,0,0,1,0,0,1,0],
  [0,1,1,0,1,0,1,1],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [0,1,0,0,0,0,1,0],
  [0,1,1,1,0,1,0,0],
  [1,0,0,1,0,0,1,0],
  [0,1,1,1,1,0,0,0],
  [1,0,1,0,0,0,1,1],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0]
]

const execute_microcode = [
  [0,0,0,1,1,1,1,1],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,0,1,1,1,1,0,1],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,1,0,1,1,1,0,1],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,0,0,0,0,1,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,1,1,1,1,0,1],
  [0,0,0,1,1,1,0,0],
  [1,1,0,0,1,1,0,1],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [1,0,0,0,1,1,0,1],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,1,1],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,1,1],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,0,0]
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
    case "set_ram":
      //ram data is a string with lines breaks between the words
      let strings_as_array = message[1].split("\n")
      if (strings_as_array.length < ram.length) {
        for (let i = 0; i < strings_as_array.length; i++) {
          if (strings_as_array[i] == "") {
            break
          }
          let number = parseInt(strings_as_array[i],2)
          if (number >= 0 && number <= 0xffff) {
            ram_change(i, number)
          } else {
            console.error(`Illegal RAM input '${strings_as_array[i]}', word ${i}`)
          }
        }
      } else {
        console.error("Program too large for RAM")
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
      reset()
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

function reset() {
  init_state()
  stop()
  send_front_panel_info()
  send_vram_changes()
  postMessage(["changed"])
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
  vram_addresses_changed[address] = true
}

function ram_change(address, new_data) {
  activity_indicators.ram_write = 1
  ram[address] = new_data
  ram_addresses_changed[address] = true
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
  debug && console.debug(` ↳ control mode: ${control_mode.toString()}`)

  debug && console.debug("---running control clock microcode:")
  // run contol unit commands that modify (directly or indirectly) the data bus
  if (control_mode === 0) {
    var instructions = get_load_fetch_microcode_instructions()
    run_load_fetch_microcode(instructions, true)
  } else {
    var instructions = get_execute_microcode_instructions()
    run_execute_microcode(instructions, true)
  }

  //simulate read bus if it has been used
  debug && console.debug(`simulating read bus with content: ${read_bus}`)
  if (read_bus !== 0) {
    simulate_effect_of_read_bus_change()
  }

  micro_program_counter++

  debug && console.debug("---running write clock microcode: ")
  //run control unit commands that depend (directly or indirectly) on the data bus
  if (control_mode === 0) {
    run_load_fetch_microcode(instructions, false)
  } else {
    run_execute_microcode(instructions, false)
  }

  if (write_bus !== 0) {
    simulate_effect_of_write_bus_change()
  }

  debug && console.debug("\n\n\n")
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

  if (read_bus >= 0x4000) {                                                 // RAM
    let address = read_bus - 0x4000
    activity_indicators.ram_read = 1
    activity_indicators.ram_address = address
    data_bus = ram[address]

  } else if (read_bus < 16384) {                                          //everywhere else (card addressing)
    var card_address = (read_bus & 0b0011100000000000) >> 11
    var address = read_bus & 0b0000011111111111

    switch (card_address) {                                               //control unit + timer + alu
      case 0:
        switch (address) {
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

  if (write_bus > 0x4000) {                                                 // RAM
    let address = write_bus - 0x4000
    activity_indicators.ram_write = 1
    activity_indicators.ram_address = address

    ram_change(address, data_bus)

  } else if (write_bus < 16384) {                                          //everywhere else (card addressing)
    var card_address = (write_bus & 0b0011100000000000) >> 11
    var address = write_bus & 0b0000011111111111

    switch (card_address) {                                               //control unit
      case 0:
        switch (address) {
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
  let arg1_addr_mode = (command_word & 0b0000010000000000) > 0
  let arg2_addr_mode = (command_word & 0b0000000010000000) > 0
  let address = (arg1_addr_mode << 4) + (arg2_addr_mode << 3) + micro_program_counter

  let instructions = load_fetch_microcode[address]

  debug && console.debug(`load/fetch microcode[${get_padded_num(address,5,2)}]`)
  debug && console.debug(`=${instructions}`)

  if (instructions === undefined) {
    halt_error("Invalid adddress for load/fetch microcode")
  }
  return instructions
}

function get_execute_microcode_instructions() {
  let opcode = (command_word & 0b1110000000000000) >> 13
  let address = (opcode << 2) + micro_program_counter
  let instructions = execute_microcode[address]

  debug && console.debug(`execute microcode[${get_padded_num(address,5,2)}]`)
  debug && console.debug(`=${instructions}`)

  if (instructions === undefined) {
    halt_error("Invalid adddress for execute microcode")
  }
  return instructions
}

function run_load_fetch_microcode(instructions, control_clock) {
  if (control_clock) {
    // inverted for simpler wiring to active-low tristate buffer enable inputs
    if (!instructions[0]) micro_instructions.fetch.pc_to_read_bus()
    if (!instructions[1]) micro_instructions.fetch.arg3_to_read_bus()
  } else {
    if (instructions[7]) micro_instructions.both.increment_mode()

    // PC/SP relative addressing modes may add to the value first
    let loading_arg1 = instructions[5]
    let loading_arg2 = instructions[4]

    let arg1_rel =    (command_word & 0b0001000000000000) > 0
    let arg1_pc_rel = (command_word & 0b0000100000000000) > 0
    let arg2_rel =    (command_word & 0b0000001000000000) > 0
    let arg2_pc_rel = (command_word & 0b0000000100000000) > 0

    // get bus value destination register
    let dest_reg = (instructions[2] << 1) + instructions[3]
    let bus_value = data_bus

    // implement SP/PC rel. addressing based on addressing mode in command word
    if (arg1_rel && loading_arg1 || arg2_rel && loading_arg2) {
      if (arg1_pc_rel && loading_arg1 || arg2_pc_rel && loading_arg2) {
        bus_value = (bus_value + program_counter) & 0xffff
      } else {
        bus_value = (bus_value + stack_pointer) & 0xffff
      }
    }

    // store value from data bus into the correct register
    micro_instructions.fetch.value_to_register(dest_reg, bus_value)

    // only increment PC after PC-relative addition has been performed
    // this simulates the control module's output latch not allowing value on the read bus to change during a clock
    if (instructions[6]) micro_instructions.fetch.increment_pc()
  }
}

function run_execute_microcode(instructions, control_clock) {
  if (control_clock) {
    let dest_select = (instructions[0] << 1) + instructions[1]
    micro_instructions.execute.arg1_to_dest(dest_select)
    if (instructions[2]) micro_instructions.execute.arg1_to_pc_AND_arg2_to_sp()
    // inverted for simpler wiring to active-low tristate buffer enable inputs
    if (!instructions[3]) micro_instructions.execute.arg2_to_write_bus()
    if (!instructions[4]) micro_instructions.execute.pc_to_data_bus()
    if (!instructions[5]) micro_instructions.execute.sp_to_data_bus_AND_arg2_inc_to_write_bus()
    if (instructions[6]) micro_instructions.execute.stop_clock()
  } else {
    if (instructions[7]) micro_instructions.both.increment_mode()
  }
}

const micro_instructions = {
  execute: {
    arg1_to_dest: (dest) => {
      switch (dest) {
        case 0: break;
        case 1:
          if ((arg_regs[1] & 1) == 0) { // (if arg 2 LSB = 0)
            program_counter = arg_regs[0]
          }; break;
        case 2: read_bus = arg_regs[0]; break;
        case 3: data_bus = arg_regs[0]; break;
      }
    },
    arg1_to_pc_AND_arg2_to_sp: () => {
      program_counter = arg_regs[0]
      stack_pointer = arg_regs[1]
    },
    arg2_to_write_bus: () => {
      write_bus = arg_regs[1]
    },
    pc_to_data_bus: () => {
      data_bus = program_counter
    },
    sp_to_data_bus_AND_arg2_inc_to_write_bus: () => {
      data_bus = stack_pointer
      write_bus = arg_regs[1] + 1
    },
    stop_clock: () => {
      stop()
    }
  },
  fetch: {
    value_to_register: (dest, value) => {
      switch (dest) {
        case 0: command_word = value; break;
        case 1: arg_regs[0] = value; break;
        case 2: arg_regs[1] = value; break;
        case 3: arg_regs[2] = value; break;
      }
    },
    arg3_to_read_bus: () => {
      read_bus = arg_regs[2]
    },
    pc_to_read_bus: () => {
      read_bus = program_counter
    },
    increment_pc: () => {
      program_counter = (program_counter + 1) & 0xffff
    },
  },
  both: {
    increment_mode: () => {
      control_mode = (control_mode + 1) & 1
      total_instructions += 0.5
      micro_program_counter = 0
    }
  }
}
