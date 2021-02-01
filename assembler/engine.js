"use strict"

let debug = false
let state

onmessage = (event) => {
  let message = event.data
  switch(message[0]) {
    case "assemble":
      let result = assemble_wrapped(message[1])
      postMessage(['result',result])
      break
    case "debug":
      debug = message[1]
      break
  }
}

function assemble_wrapped(input) {
  try {
    return assemble(input.split("\n"))
  } catch (error) {
    if (error instanceof AsmError) {
      log.error(error.toString())
    } else {
      throw error
    }
    return null
  }
}

function AsmError(message, line) {
  this.message = message
  this.line = line
}

AsmError.prototype.toString = function() {
  return `line ${this.line}:\n${this.message}`
}

const log = {
  debug: (msg) => send_log(msg,"debug"),
  info: (msg) => send_log(msg,"info"),
  warn: (msg) => send_log(msg,"warn"),
  error: (msg) => send_log(msg,"error")
}

function send_log(message, level) {
  if (level === "debug" && !debug) {
    return
  }

  let text
  if (typeof message === "object") {
    text = JSON.stringify(message)
  } else {
    text = message
  }
  postMessage(["log", level, text])
}

const BITS = 16
const NUMBER_REGEX = /^(\d+|0b[10]+|0x[0-9a-fA-F]+)$/
const INSTRUCTION_REGEX = /^(stop|return|goto|call|write|copy)/
const SQUARE_BRACKET_REGEX = /\[(.*)\]/
const RELATIVE_ADDRESS_REGEX = /(pc|sp)([+-].+)/
const LABEL_REFERENCE_REGEX = /^([~#])([^+-\s]*)([\+-]\d+)?$/
const ADDRESS_MNEMONIC_REGEX = /(ram|vram).(\d+)/

const RAM_BASE = 0x4000
const VRAM_BASE = 0x1800

const MNEMONICS = {
  "timer.high" : 3,
  "timer.low" : 4,
  "alu.1" : 8,
  "alu.2" : 9,
  "alu.+" : 10,
  "alu.-" : 11,
  "alu.>>" : 12,
  "alu.<<" : 13,
  "alu.&" : 14,
  "alu.|" : 15,
  "alu.!" : 16,
  "alu.>" : 17,
  "alu.<" : 18,
  "alu.=" : 19,
  "alu.ov" : 20,
  "io.inp1" : 4096,
  "io.inp2" : 4097,
  "io.inp3" : 4098,
  "io.out1" : 4099,
  "io.out2" : 4100,
  "io.out3" : 4101,
  "io.kbd": 4102
}

function init_state() {
  state = {
    labels: {},
    ast: []
  }
}

function twos_complement_encode(number) {
  const max = (2**BITS)
  if (number < 0) {
    return max+number
  } else {
    return number
  }
}

function padded_binary(number) {
  const zeros = '0'.repeat(BITS)
  return `${zeros}${number.toString(2)}`.slice(-BITS)
}

function parse_int(string) {
  if (string.startsWith("0b")) {
    return parseInt(string.substring(2),2)
  } else if (string.startsWith("0x")) {
    return parseInt(string)
  } else {
    return parseInt(string)
  }
}

class AddressingMode {
  constructor(direct, relative, program_counter) {
    this.direct = direct
    this.relative = relative
    this.program_counter = program_counter
  }

  toString() {
    let string = ""
    if (this.direct) {
      string += "direct"
    } else {
      string += "imm."
    }

    if (this.relative) {
      string += ", "
      if (this.program_counter) {
        string += "PC-rel"
      } else {
        string += "SP-rel"
      }
    }

    return string
  }

  get_value() {
    const relative_bit = this.relative ? 1 : 0
    const program_counter_bit = this.program_counter ? 1 : 0
    const direct_bit = this.direct ? 1 : 0
    return (relative_bit << 2) + (program_counter_bit << 1) + (direct_bit)
  }
}

class Argument {
  constructor(content, addressing_mode) {
    this.content = content
    this.addressing_mode = addressing_mode
  }

  set_address(address) {
    this.address = address
  }

  toString() {
    return `${this.content} ${this.addressing_mode}`
  }

  get_value() {
    if (this.content instanceof Literal) {
      return this.content.get_value()
    } else if (this.content instanceof Label) {
      let value = this.content.get_value()

      if (this.addressing_mode.relative && this.addressing_mode.program_counter) {
        // pc-relative addressing, so the offset instead of absoulute value should be used
        value -= this.address
      }

      return value
    }
  }
}

class Literal {
  constructor(content) {
    let parsed = parse_int(content)
    if (parsed < 0 || parsed > 0xffff) {
      throw new AsmError(`Data values must be in the range 0-65535`)
    }
    this.value = parsed
  }

  get_value() {
    return this.value
  }

  toString() {
    return `${this.get_value()}`
  }
}

class Label {
  constructor(name, offset) {
    this.name = name
    if (offset !== undefined) {
      this.offset = parse_int(offset)
    } else {
      this.offset = 0
    }
  }

  toString() {
    return this.name
  }

  get_value() {
    if (this.name in state.labels) {
      return state.labels[this.name].address + this.offset
    } else {
      throw new AsmError(`Label '${this.name}' is undefined`)
    }
  }
}

class AsmEntry {
  set_address(address) {
    this.address = address
  }

  set_line(line) {
    this.line = line
  }

  get_size() {
    throw new Error("Must be overridden")
  }
}

class LabelDefinition extends AsmEntry {
  constructor(name) {
    super()
    this.name = name
  }

  get_size() {
    return 0
  }

  toString() {
    return `<LabelDefinition: ${this.name}>`
  }

  set_address(address) {
    if (this.name in state.labels) {
      const previous_definition = state.labels[this.name].line
      throw new AsmError(`Label '${this.name}' has already been defined on line ${previous_definition}`, this.line)
    }

    log.debug(`Register label ${this.name} at 0x${address.toString(16)}`)
    state.labels[this.name] = {
      address: address,
      line: this.line
    }
  }

  generate(address) {
    return []
  }
}

class Data extends AsmEntry {
  constructor(literral) {
    super()

    if (literral instanceof Literal) {
      this.literral = literral
    } else {
      throw new Error("Data must be constructed from a Literal")
    }
  }

  get_size() {
    return 1
  }

  generate() {
    return [this.literral.get_value()]
  }

  toString() {
    return `<Data: ${this.literral.toString()}>`
  }
}

class Instruction extends AsmEntry {
  constructor(args) {
    super()

    this.args = args

    let arg_number = this.get_num_arguments()
    if (this.args.length !== arg_number) {
      throw new AsmError(`Instruction requires ${arg_number} argument(s)`)
    }
  }

  set_address(address) {
    this.address = address

    let offset = 1
    for (const argument of this.args) {
      argument.set_address(this.address + offset)
      offset++
    }
  }

  get_size() {
    return 3
  }

  get_num_arguments() {
    return 2
  }

  toString() {
    let string = `<${this.constructor.name}:`
    for (const arg of this.args) {
      string += ` <${arg}>`
    }
    return `${string}>`
  }

  get_opcode() {
    throw new Error("Must be overridden")
  }

  generate() {
    let command_word = this.get_opcode() << 13

    let position = 10
    for (const argument of this.args) {
      command_word += argument.addressing_mode.get_value() << position
      position -= 3
    }

    let argument_words = []
    for (const argument of this.args) {
      argument_words.push(argument.get_value())
    }

    let result = [command_word]
    result.push(...argument_words)

    return result
  }
}

class StopInstruction extends Instruction {
  get_num_arguments() {return 0}

  get_opcode() {return 0}

  generate() {return [0,0,0]}
}

class ReturnInstruction extends Instruction {
  get_opcode() {return 1}
}

class GotoInstruction extends Instruction {
  get_opcode() {return 2}
}

class CallInstruction extends Instruction {
  get_opcode() {return 3}
}

class WriteInstruction extends Instruction {
  get_opcode() {return 4}
}

class CopyInstruction extends Instruction {
  get_opcode() {return 5}
}

function parse_mnemonic(string) {
  if (ADDRESS_MNEMONIC_REGEX.test(string)) {
    let [,area,value] = ADDRESS_MNEMONIC_REGEX.exec(string)
    value = parse_int(value)

    switch (area) {
      case "ram":
        if (value >= 0 && value <= 49151) {
          return RAM_BASE + value
        } else {
          throw new AsmError(`Address '${value}' out of range [0, 49151]`)
        }
        break;
      case "vram":
        if (value >= 0 && value <= 1023) {
          return VRAM_BASE + value
        } else {
          throw new AsmError(`Address '${value}' out of range [0, 1023]`)
        }
        break;
      default:
        throw new AsmError(`Unknown mnemonic prefix '${area}'`)
        break;
    }
  } else if (string in MNEMONICS) {
    return MNEMONICS[string]
  } else {
    throw new AsmError(`Unknown mnemonic '${string}'`)
  }
}

function parse(input) {
  input = input.trim()

  if (input.startsWith("//") || input == "") {
    // comment / whitespace
    return null

  } else if (input.endsWith(":")) {
    // label definition
    return new LabelDefinition(input.slice(0,-1))

  } else if (NUMBER_REGEX.test(input)) {
    // data
    return new Data(new Literal(input))

  } else if (INSTRUCTION_REGEX.test(input)) {
    // instruction

    let strings = input.split(" ")
    let instruction_string = strings[0]
    let arg_strings = strings.slice(1)


    let args = []
    for (let string of arg_strings) {
      let content
      let is_direct = SQUARE_BRACKET_REGEX.test(string)

      if (is_direct) {
        string = string.slice(1,-1)
      }
      let is_relative = false
      let program_counter_relative = false

      if (RELATIVE_ADDRESS_REGEX.test(string)) {
        // pc±literal, sp±literal
        is_relative = true
        let [,mode,value] = RELATIVE_ADDRESS_REGEX.exec(string)

        program_counter_relative = mode === "pc"
        content = new Literal(value)

      } else if (LABEL_REFERENCE_REGEX.test(string)) {
        // #label, ~label
        let [,mode,label,offset] = LABEL_REFERENCE_REGEX.exec(string)

        if (mode === "~") {
          // ~label = relative mode
          is_relative = true
          program_counter_relative = true
        }
        // otherwise, absolute mode
        content = new Label(label, offset)

      } else if (NUMBER_REGEX.test(string)) {
        // literal
        content = new Literal(string)

      } else {
        content = new Literal(parse_mnemonic(string).toString())
        // throw new AsmError("Syntax error")
      }

      let addressing_mode = new AddressingMode(is_direct, is_relative, program_counter_relative)
      args.push(new Argument(content, addressing_mode))
    }

    let instruction
    switch (instruction_string) {
      case "stop": instruction = StopInstruction; break
      case "return": instruction = ReturnInstruction; break
      case "goto": instruction = GotoInstruction; break
      case "call": instruction = CallInstruction; break
      case "write": instruction = WriteInstruction; break
      case "copy": instruction = CopyInstruction; break
      default:
        throw new AsmError(`Unknown instruction '${instruction_string}'`)
    }
    return new instruction(args)

  } else {
    throw new AsmError("Syntax error")
  }
}

function assemble(input) {
  init_state()

  log.info("Tokenising...")
  for (let i = 0; i < input.length; i++) {

    let line_num = i + 1
    let result
    try {
      result = parse(input[i])
    } catch (error) {
      if (error instanceof AsmError) {
        throw new AsmError(error.message, line_num)
      } else {
        throw error
      }
    }

    if (result !== null) {
      result.set_line(line_num)
      state.ast.push(result)
    }
  }
  log.info(`↳ success, ${input.length} line(s)`)

  log.info("Translating...")
  let counter = 0x4000
  for (const line of state.ast) {
    line.set_address(counter)
    let size = line.get_size()
    counter += size
  }

  let output = []
  for (const line of state.ast) {
    let result = line.generate()
    log.debug(line.toString())
    output.push(...result)
  }
  log.info(`↳ success, ${state.ast.length} tokens(s)`)

  // 2 bytes per word
  log.info(`Output size: ${output.length * 2} bytes`)


  output = output.map(twos_complement_encode).map(padded_binary)

  return output.join("\n")
}

log.info("Assembler thread started")
