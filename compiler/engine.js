"use strict"

let state = {}
let show_log_messages = true
let debug = false

// load the standard library and define the timer function
let timer = () => performance.now()
importScripts('libraries.js')

const MIN_FRAME_SIZE = 2
const MAX_FRAME_SIZE = 2048
const MAX_RAM_SIZE = 16384
const DATA_TYPE_SIZE = { u16:1, s16:1, u32:2, s32:2, float:2, bool:1, str:1, array:4, none:0 }
const MIXABLE_NUMERIC_TYPES = [["u16","s16"],["u32","s32"]]
const RESERVED_KEYWORDS = [
  "if","for","while","repeat","struct","def","true","false","sys","return","break","continue","include","__root","__global", "__return"
]
const RETURN_INSTRUCTION = "return [stack.0] [stack.1]"
const STRUCTURE_INDENT = "  "

onmessage = (event) => {
  let message = event.data
  switch(message[0]) {
    case "compile":
      let result = ""
      try {
        result = compile(message[1].split('\n'), false)
      } catch (error) {
        if (error instanceof CompError) {
          log.error(error.toString())
        } else {
          throw error
        }
      } finally {
        let ast = JSON.stringify(state.ast, null, 2)
        postMessage(["result", result, ast])
      }
      break
    case "debug":
      debug = message[1]
      break
  }
}

const log = {
  debug: (msg) => send_log(msg, "debug"),
  info: (msg) => send_log(msg, "info"),
  warn: (msg) => send_log(msg, "warn"),
  error: (msg) => send_log(msg, "error")
}

function send_log(message, level) {
  if (level !== "error" && !show_log_messages || (level === "debug" && !debug)) {
    return
  }

  let text
  if (typeof message === "object") {
    text = JSON.stringify(message, null, 2)
  } else {
    text = message
  }
  postMessage(["log", level, text])
}

function CompError(message, line) {
  this.message = message
  this.line = line
  this.toString = () => {
    return `line ${this.line}:\n${this.message}`
  }
}

function init_state() {
  state = {
    scope: "__root",
    include_only_signatures_mode: false,
    symbol_table: {__root:{}, __global:{}},
    struct_definitions: {},
    frame_usage: {__root:[], __global:[]},
    function_table: {},
    data: [],
    code: {},
    required_libs: [],
    inner_structure_label: null,
    labels: {__root: {if:0, for:0, while:0, str:0, expr_array:0}},
    ast: []
  }
}

function pad(string, width) {
 return string.length >= width ? string : new Array(width - string.length + 1).join("0") + string
}

function get_static_value(token, type, fail) {
  let [token_prefix, token_value, token_type] = translate(token, type)

  if (token_prefix.length > 0 || token_type !== type) {
    fail()
  } else {
    return token_value
  }
}

function parse_int(string) {
  if (string.startsWith("0b")) {            //bin (positive)
    return parseInt(string.substring(2),2)
  } else if (string.startsWith("-0b")) {    //bin (negative)
    return -parseInt(string.substring(3),2)
  } else if (string.startsWith("0x")) { //hex
    return parseInt(string)
    //parseInt can handle negative hex numbers on its own
  } else {                                     //dec
    return parseInt(string)
  }
}

function find_type_priority(expr1, expr2, target_type) {
  let strong_typed_expr, weak_typed_expr

  // if both expressions are numbers, use the target_type (given by the context)
  if (target_type !== undefined && expr1.name === "number" && expr2.name === "number") {
    return target_type
  }

  // only number tokens are weakly-typed
  if (expr1.name === "number") {
    [strong_typed_expr, weak_typed_expr] = [expr2, expr1]
  } else if (expr2.name === "number") {
    [strong_typed_expr, weak_typed_expr] = [expr1, expr2]
  } else {
    // if both are strongly-typed, default to the 1st one
    [strong_typed_expr, weak_typed_expr] = [expr2, expr1]
  }

  // find the type of strong_typed_expr
  let priority_type = translate(strong_typed_expr)[2]

  // try to coerce the weak_typed_expr to the same type
  let coerced_type = translate(weak_typed_expr, priority_type)[2]

  assert_compatable_types(priority_type, coerced_type, expr1.line)

  return priority_type
}

function assert_compatable_types(type1, type2, line, custom_fail) {
  if (type1 === type2) {
    return
  } else {
    for (let set of MIXABLE_NUMERIC_TYPES) {
      if (set.includes(type1) && set.includes(type2)) {
        log.warn(`line ${line}:\nImplicit cast '${type1}' -> '${type2}'`)
        return
      }
    }
  }

  if (custom_fail === undefined) {
    throw new CompError(`Expected compatable types, but got '${type1}' & '${type2}'`)
  } else {
    custom_fail()
  }
}

function set_token(name, operation, exprs, line) {
  let add = {name:operation,type:"expression",arguments:{expr1:exprs[0],expr2:exprs[1]}}
  let set_var = {name:"set",type:"command",arguments:{expr:add,name:name},"line":line}
  return set_var
}

function assert_local_name_available(name) {
  const places = [
    Object.keys(state.symbol_table[state.scope]),
    Object.keys(state.function_table),
    RESERVED_KEYWORDS
  ]

  for (let place of places) {
    if (place.includes(name)) {
      throw new CompError(`Name '${name}' is not available`)
    }
  }
}

function assert_global_name_available(name) {
  assert_local_name_available(name)

  if (name in state.symbol_table.__global) {
    throw new CompError(`Name '${name}' is not available`)
  }
}

function assert_valid_name(name) {
  if (!(/^[a-zA-Z_]\w*$/.test(name))) {
    throw new CompError(`Invalid name '${name}'`)
  }
}

function assert_valid_function_name(name) {
  if (!(/^[a-zA-Z_][\w.]*$/.test(name))) {
    throw new CompError(`Invalid function name '${name}'`)
  }
}

function buffer_if_needed(address) {
  if (/(alu\.)|(ram\+\.)/.test(address)) {
    let buffer = get_temp_word()
    return {
      prefix: [`write ${address} ${buffer.label}`],
      label: `[${buffer.label}]`,
      free: buffer.free
    }
  } else {
    return {
      prefix: [],
      label: address,
      free: () => {}
    }
  }
}

function gen_label(type) {
  let id = state.labels[state.scope][type]++
  return `${state.scope}_${id}`
}

function write_operands(expr1, expr2, type) {
  let result = []
  let [expr1_prefix, expr1_reg] = translate(expr1, type)
  let [expr2_prefix, expr2_reg] = translate(expr2, type)
  result.push(...expr1_prefix)
  result.push(`write ${expr1_reg} alu.1`)
  result.push(...expr2_prefix)
  result.push(`write ${expr2_reg} alu.2`)
  return result
}

function write_operand(expr, type) {
  let [expr_prefix, expr_reg] = translate(expr, type)
  expr_prefix.push(`write ${expr_reg} alu.1`)
  return expr_prefix
}

function operation_assignment_token(var_name, op, value_token) {
  let var_token = {name:"var_or_const", type:"expression", arguments: {
    name:var_name
  }}

  let token = set_token(var_name, op, [var_token, value_token])
  return translate(token)
}

function function_call(name, args, type, raw_input = false) {
  load_lib(name)
  if (raw_input) {
    // if the arguments are not tokens, first tokenise them
    args = args.map(tokenise)
  }
  let token = {
    name:"function",
    type:"expression",
    arguments: {
      name: name,
      exprs: args,
      ignore_type_mismatch: true,
      forced_type: type
    }
  }

  return translate(token)
}

function replace_var_references(words) {
  // for each word in the assembly statement, check to see if any names need
  // substituting for their ram addresses
  for (let i = 0; i < words.length; i++) {
    let word = words[i]

    // names begining with & represent the address of the variable
    let addr_operator = word.startsWith("&")

    // names begining with & represent the value of the variable
    let value_operator = word.startsWith("$")

    if (addr_operator || value_operator) {
      let name = word.substr(1) // remove the operator character
      let index_regex = /\[(\d+)\]/.exec(name) // check for an index after the name
      let index = 0

      if (index_regex !== null) {
        index = parseInt(index_regex[1])    // parse the index value
        name = /(\w+)\[\d+\]/.exec(name)[1] // trim the name to exclude the index
      }

      let token = {name:"var_or_const", type:"expression", arguments: {
        name: name
      }}

      let [prefix, values] = translate(token)
      if (index >= values.length) {
        throw new CompError(`Cannot access word ${index + 1} of a ${values.length}-word data type`)
      }

      let symbol = values[index]

      if (addr_operator) {
        words[i] = symbol.slice(1, -1)
      } else {
        words[i] = symbol
      }
    }
  }

  return words
}

function get_array_info(array_name) {
  let local_table = state.symbol_table[state.scope]
  let global_table = state.symbol_table.__global

  let table_entry
  if (array_name in local_table) {
    // this is a local array
    table_entry = local_table[array_name]
  } else if (array_name in global_table) {
    // this is a global array
    table_entry = global_table[array_name]
  } else {
    throw new CompError(`Cannot find array named '${array_name}'`)
  }

  let is_constant = table_entry.type == "constant"
  let array_type = table_entry.specific.element_data_type
  let base_addr = table_entry.specific.ram_addresses[0]
  let current_len = table_entry.specific.ram_addresses[1]
  let max_len = table_entry.specific.ram_addresses[2]

  if (!is_constant) {
    let addr_prefix = table_entry.specific.addr_prefix
    base_addr = `[${addr_prefix}${base_addr}]`
    current_len = `[${addr_prefix}${current_len}]`
    max_len = `[${addr_prefix}${max_len}]`
  }

  return {
    assert_writeable: () => {
      if (is_constant) {
        throw new CompError(`Constant array '${array_name}' cannot be modified`)
      }
    },
    array_type: array_type,
    item_size: get_data_type_size(array_type),
    base_addr: base_addr,
    current_len: current_len,
    max_len: max_len
  }
}

function alloc_stack(size) {
  // TODO find first contiguous slot for allocation instead of assuming the end
  log.debug(`Request for ${size} words(s) of stack`)
  let addrs = []
  let base_addr = frame_size(state.scope)

  for (let i = 0; i < size; i++) {
    let addr = base_addr + i
    if (addr >= MAX_FRAME_SIZE) {
      throw new CompError(`Stack frame is out of memory, ${size} word(s) requested (only ${MAX_FRAME_SIZE - base_addr} free)`)
    }
    addrs.push(addr)
    state.frame_usage[state.scope].push(addr)
  }

  return addrs
}

function free_stack(addrs) {
  let filter = item => !addrs.includes(item)
  state.frame_usage[state.scope] = state.frame_usage[state.scope].filter(filter)
}

function alloc_global(size) {
  // TODO find first contiguous slot for allocation instead of assuming the end
  log.debug(`Request for ${size} words(s) of global RAM`)
  let addrs = []
  let base_addr = frame_size("__global")

  for (let i = 0; i < size; i++) {
    let addr = base_addr + i
    if (addr >= MAX_RAM_SIZE) {
      throw new CompError(`Out of memory, ${size} word(s) requested (only ${MAX_RAM_SIZE - base_addr} free)`)
    }
    addrs.push(addr)
    state.frame_usage.__global.push(addr)
  }

  return addrs
}


function free_global(addrs) {
  let filter = item => !addrs.includes(item)
  state.frame_usage.__global = state.frame_usage.__global.filter(filter)
}

function frame_size(scope) {
  let frame_usage = state.frame_usage[scope]

  if (frame_usage.length == 0) {
    if (scope === "__global") {
      return 0
    } else {
      return MIN_FRAME_SIZE
    }
  } else {
    return frame_usage[frame_usage.length - 1] + 1
  }
}

function stack_to_absolute(stack_addr) {
  let prefix = [
    `write ${stack_addr + 16384} alu.1`,
    `write [ctl.sp] alu.2`
  ]
  return {
    prefix: prefix,
    value: "[alu.+]"
  }
}

function assert_valid_datatype(type) {
  if (!is_data_type(type)) {
    throw new CompError(`Data type '${type}' unknown`)
  }
}

function assert_datatype_name_available(type) {
  if (is_data_type(type)) {
    throw new CompError(`Data type name '${type}' is not available`)
  }
}

function is_data_type(type) {
  return type in DATA_TYPE_SIZE || type in state.struct_definitions
}

function get_data_type_size(type) {
  if (type in DATA_TYPE_SIZE) {
    // it's a built in data type
    return DATA_TYPE_SIZE[type]
  } else if (type in state.struct_definitions) {
    // it's a struct
    return state.struct_definitions[type].size
  } else {
    throw new CompError(`Cannot determine size of data type '${type}'`)
  }
}

function get_temp_word() {
  let addr = alloc_stack(1)
  return {
    addr: addr[0],
    label: `stack.${addr[0]}`,
    free: () => free_stack([addr])
  }
}

function translate_body(tokens, indent = true) {
  let result = []
  for (let token of tokens) {
    if (token.type === "expression" && token.name !== "function") {
      throw new CompError("Unexpected expression", token.line)
    }

    let output, instructions, data_type
    try {
      output = translate(token)
    } catch (error) {
      if (error instanceof CompError && error.line === undefined) { // if this is CompError with no line info
        throw new CompError(error.message, token.line) // add the line number to it
      } else {
        throw error
      }
    }

    // expressions return a different format to commands
    if (token.type === "expression") {
      instructions = output[0]
      data_type = output[2]
    } else {
      instructions = output
    }

    if (token.name === "function" && data_type !== "none") {
      log.warn(`line ${token.line}:\nDiscarding function's returned value of type '${data_type}'`)
    }

    if (indent) {
      instructions = instructions.map((line) => STRUCTURE_INDENT + line)
    }
    result.push(...instructions)
  }
  return result
}

function load_lib(name) {
  log.debug(`loading library object ${name}`)
  if (!(name in libs)) {
    throw new CompError(`Library '${name}' not found`)
  }
  if (state.include_only_signatures_mode) {
    return
  }
  if (state.required_libs.includes(name) || name in state.function_table) {
    log.debug("↳ already loaded")
  } else {
    state.required_libs.push(name)
    log.debug("↳ compiling")
    if (name == "sys.signatures") {
      state.include_only_signatures_mode = true
    }
    let old_log_status = show_log_messages
    try {
      show_log_messages = false
      compile(libs[name], true)
    } catch (error) {
      if (error instanceof CompError) { // if this is CompError with no line info
        // let the user know the error in the standard library - and not their fault
        throw new CompError(error.message, `${error.line} [in library obj. '${name}']`)
      } else {
        throw error
      }
    } finally {
      show_log_messages = old_log_status
    }
  }
}

function tokenise(input, line) {
  input = input.trim()
  line = line || -1
  let list = input.split(" ")
  let token = {}

  if (/^\/\//.test(input)) { // a comment begining with "//"
    token = {name:"comment",type:"command",arguments:{"comment":input}}

  } else if (/^{(.+)}$/.test(input)) {
    token = {name:"asm",type:"command",arguments:{value:/{(.+)}/.exec(input)[1]}}

  } else if (/^#([^#]+)#$/.test(input)) {
    token = {name:"inline_asm",type:"expression",arguments:{value:/^#([^#]+)#$/.exec(input)[1]}}

  } else if (/^<(.+)>$/.test(input)) {
    let content = /^<(.+)>$/.exec(input)[1]
    let expr_strings = content.split(",")
    let exprs = []

    for (let string of expr_strings) {
      exprs.push(tokenise(string, line))
    }

    token = {name:"struct_init",type:"expression",arguments:{exprs:exprs}}

  } else if (/^\"(.+)\"$|^(\"\")$/.test(input)) {     //string
    token = {name:"str",type:"expression",arguments:{value:input,type_guess:"str"}}

  } else if (/^(const|global|let) (\S+) (\S+)(?: = (.+))?$/.test(input)) {        // (var/global) [type] [name] <expr>
    let matches = /^(const|global|let) (\S+) (\S+)(?: = (.+))?$/.exec(input)

    let alloc_type = matches[1]
    let type =  matches[2]
    let name = matches[3]
    let expr_text = matches[4]

    assert_valid_name(name)
    let expr
    if (expr_text !== undefined) {
      expr = tokenise(expr_text, line)
    }

    let token_name, is_global
    if (alloc_type === "const") {
      token_name = "const_alloc"
      is_global = true
    } else {
      token_name = "var_alloc"
      is_global = alloc_type == "global"
    }

    token = {name:token_name, type:"command", arguments: { type:type, name:name, expr:expr, global:is_global }}

  } else if (list[0] === "if") {               // if [bool]
    if (list.length > 1) {
      let expr = tokenise(list.slice(1).join(" "), line) // extract all the letters after command
      token = {name:"if",type:"structure",body:[],arguments:{expr:expr}}
    } else {
      throw new CompError("If statement has no conditional expression")
    }

  } else if (/^(else)$/.test(input)) {         //else
    token = {name:"else",type:"structure",arguments:{}}

  } else if (/(else\sif)/.test(input)) {      //else if
    if (list.length > 2) {
      let expr = tokenise(list.slice(2).join(" "), line) // extract all the letters after command
      token = {name:"else if",type:"structure",arguments:{expr:expr}}
    } else {
      throw new CompError("Else If statement has no conditional expression")
    }

  } else if (list[0] === "while") {              // while [bool]
    if (list.length > 1) {
      let expr = tokenise(list.slice(1).join(" "), line) // extract all the letters after command
      token = {name:"while",type:"structure",body:[],arguments:{expr:expr}}
    } else {
      throw new CompError("While statement has no conditional expression")
    }

   } else if (list[0] === "for") {               // for [cmd];[bool];[cmd]
    if (list.length > 1) {
      let string_list = input.slice(3).split(";")
      let init = tokenise(string_list[0],line)
      let expr = tokenise(string_list[1],line)
      let cmd = tokenise(string_list[2],line)
      token = {name:"for",type:"structure",body:[],arguments:{init:init,expr:expr,cmd:cmd}}
    } else {
      throw new CompError("Missing cmd/bool/cmd list")
    }

  } else if (list[0] === "repeat") {               // repeat [postive number]
    if (list.length > 1) {
      let expr = tokenise(list.slice(1).join(" "), line) // extract all the letters after command
      token = {name:"repeat",type:"structure",body:[],arguments:{expr:expr}}
    } else {
      throw new CompError("Repeat statement has no number")
    }

  } else if (/(def|sig)\ ([\w\.]+)\((.*)\)(?:\s*->\s*(#?\w*))?/.test(input)) { // def/sig [name](<args>) -> [type]
    let matches = /(def|sig)\ ([\w\.]+)\((.*)\)(?:\s*->\s*(#?\w*))?/.exec(input)
    let def_type = matches[1]
    let name = matches[2]
    let arg_string = matches[3]
    let type = matches[4]
    assert_valid_function_name(name)

    let args = []
    if (arg_string !== "") {
      let items = arg_string.split(",")
      for (let item of items) {
        args.push(tokenise(item, line))
      }
    }

    let force_cast = false
    if (type === undefined) {
      type = "none"
    } else if (type.startsWith("#")) {
      force_cast = true
      type = type.substr(1)
    }
    switch (def_type) {
      case "def":
        token = {name:"function_def",type:"structure",body:[],arguments:{name:name,args:args,type:type,force_cast:force_cast}}
        break
      case "sig":
        token = {name:"signature_def",type:"command",arguments:{name:name,args:args,type:type,force_cast:force_cast}}
        break
    }

  } else if (list[0] === "struct") {                  //struct [name]
    if (list.length < 2) {
      throw new CompError("Structs require a name")
    } else if (list.length > 2) {
      throw new CompError("Invalid syntax")
    }
    assert_valid_name(list[1])

    token = {name:"struct_def",type:"structure",body:[],arguments:{name:list[1]}}

  } else if (list[0] === "free") {                 // free [name]
    token = {name:"delete",type:"command",arguments:{name:list[1]}}

  } else if (/^break$/.test(input)) {                 // break
    token = {name:"break",type:"command",arguments:{}}

  } else if (/^continue$/.test(input)) {                 // break
    token = {name:"continue",type:"command",arguments:{}}

  } else if (/^([a-zA-Z_]\w*)\s*=\s*([^=].*)$/.test(input)) {                    // [name] = [expr]
    let matches = /^([a-zA-Z_]\w*)\s*=\s*([^=].*)$/.exec(input)
    let expr = tokenise(matches[2], line)
    token = {name:"set",type:"command",arguments:{expr:expr,name:matches[1]}}

  } else if (/^([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)\s*=\s*([^=].*)$/.test(input)) {                    // [struct].[member] = [expr]
    let matches = /^([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)\s*=\s*([^=].*)$/.exec(input)

    let name = matches[1]
    let member = matches[2]
    let expr = tokenise(matches[3], line)

    token = {name:"struct_member_set",type:"command",arguments:{expr:expr,name:name,member:member}}

  } else if (/^\*([a-zA-Z_]\w*)\s*=\s*([^=].*)$/.test(input)) {                    // *[pointer] = [expr]
    let matches = /^\*([a-zA-Z_]\w*)\s*=\s*([^=].*)$/.exec(input)
    let expr = tokenise(matches[2], line)
    token = {name:"pointer_set",type:"command",arguments:{expr:expr,name:matches[1]}}

  } else if (list[0] === "return") {                    // return
    let expr = undefined
    let expr_string = list.slice(1).join(" ")

    if (expr_string !== "") {
      expr = tokenise(expr_string, line)
    }

    token = {name:"return",type:"command",arguments:{expr:expr}}

  } else if (list[1] === "+=") {                    // [name] += [expr]
    let expr = tokenise(list.slice(2).join(" "), line)
    token = {name:"addition_assignment",type:"command",arguments:{expr:expr,name:list[0]}}

  } else if (list[1] === "-=") {                    // [name] -= [expr]
    let expr = tokenise(list.slice(2).join(" "), line)
    token = {name:"subtraction_assignment",type:"command",arguments:{expr:expr,name:list[0]}}

  } else if (list[1] === "*=") {                    // [name] *= [expr]
    let expr = tokenise(list.slice(2).join(" "), line)
    token = {name:"multiplication_assignment",type:"command",arguments:{expr:expr,name:list[0]}}

  } else if (list[1] === "/=") {                    // [name] /= [expr]
    let expr = tokenise(list.slice(2).join(" "), line)
    token = {name:"division_assignment",type:"command",arguments:{expr:expr,name:list[0]}}

  } else if (list[1] === "%=") {                    // [name] %= [expr]
    let expr = tokenise(list.slice(2).join(" "), line)
    token = {name:"modulo_assignment",type:"command",arguments:{expr:expr,name:list[0]}}

  } else if (/.+?(?=\+\+)/.test(input)) { //  [name]++
    token = {name:"increment_1",type:"command",arguments:{name:/.+?(?=\+\+)/.exec(input)}}

  } else if (/.+?(?=\-\-)/.test(input)) { //  [name]--
    token = {name:"decrement_1",type:"command",arguments:{name:/.+?(?=\-\-)/.exec(input)}}

  } else if (/^\*(\(.*\))?([a-zA-Z_]\w*)$/.test(input)) {                    // pointer lookup
    let matches = /^\*(\(.*\))?([a-zA-Z_]\w*)$/.exec(input)
    let type_cast
    if(matches[1] !== undefined) {
      type_cast = matches[1].slice(1, -1)
    }
    let var_or_const_name = matches[2]
    token = {name:"pointer_lookup",type:"expression",arguments:{type_cast:type_cast,var_or_const_name:var_or_const_name}}

  } else if (/^\((.*)\)$/.test(input)) {  // it is an expression that is in brackets
    throw new CompError("Not implemented")

  } else if (/^(\d+|0b[10]+|0x[0-9a-fA-F]+)$/.test(input)) { //        [unsigned integer]   is dec/hex/bin number only
    let dec_val = parse_int(input)
    let guess
    if (dec_val > 65535) {
      guess = "u32"
    } else {
      guess = "u16"
    }
    token = {name:"number",type:"expression",arguments:{value:input,type_guess:guess}}

  } else if (/(^[+-]?\d+$)|(^-?0b[10]+$)|(^-?0x[0-9a-fA-F]+$)/.test(input)) { //   [signed integer]
    let dec_val = parse_int(input)
    let guess
    if (Math.abs(dec_val) > 32767) {
      guess = "s32"
    } else {
      guess = "s16"
    }
    token = {name:"number",type:"expression",arguments:{value:input,type_guess:guess}}

  } else if (list[0] === "include") {
    token = {name:"include",type:"command",arguments:{name:list[1]}}

  } else if (/^([a-zA-Z_]\w*)\.(append|insert)\((.*)\)$/.test(input)) {   // array function ie. array_name.insert/append(args)
    let matches = /^([a-zA-Z_]\w*)\.(append|insert)\((.*)\)$/.exec(input)
    let array_name = matches[1]
    let operation = matches[2]
    let argument_string = matches[3]
    let args = argument_string.split(",")

    let argument_tokens = []

    for (let argument of args) {
      argument_tokens.push(tokenise(argument,line))
    }

    token = {name:"array_function",type:"command",arguments:{
      name: array_name,
      operation: operation,
      exprs: argument_tokens
       }
    }

  } else if (/^([a-zA-Z_]\w*)\[(.+)\]\s*=\s*(.*)$/.test(input)) {       //array set ie array_name[index] = some value
    let matches = /^([a-zA-Z_]\w*)\[(.+)\]\s*=\s*(.*)$/.exec(input)
    let array_name = matches[1]
    let index_expression = matches[2]
    let value = matches[3]

    token = {name:"array_set",type:"command",arguments:{
      name: array_name,
      index_expr: tokenise(index_expression,line),
      expr: tokenise(value,line)
      }
    }

  } else if (/^([a-zA-Z_]\w*)\.(len|pop|max_len)\(\)$/.test(input)) {       //array function ie array_name.pop/len()
    let matches = /^([a-zA-Z_]\w*)\.(len|pop|max_len)\(\)$/.exec(input)
    let array_name = matches[1]
    let operation = matches[2]

    token = {name:"array_expression",type:"expression",arguments:{
      name: array_name,
      operation: operation
      }
    }

  } else if (/^([a-zA-Z_]\w*)\[(.+)\]$/.test(input)) {       //array expression ie array_name[index]
    let matches = /^([a-zA-Z_]\w*)\[(.+)\]$/.exec(input)
    let array_name = matches[1]
    let index_expression = matches[2]

    token = {name:"array_expression",type:"expression",arguments:{
      name: array_name,
      operation: "index",
      expr: tokenise(index_expression,line)
      }
    }

  } else if (/^([\w.]+#?)\((.*)\)$/.test(input)) { // function call [name](*)
    let matches = /^([\w.]+#?)\((.*)\)$/.exec(input)

    let name = matches[1]
    let args_string = matches[2]
    let string_list = args_string.split(",")
    let ignore_type_mismatch = false
    let args = []
    if (args_string !== "") {
      for (let item of string_list) {
        if (item !== undefined) {
          args.push(tokenise(item,line))
        }
      }
    }
    if (name.endsWith("#")) {
      ignore_type_mismatch = true
      name = name.slice(0, -1)
    }

    token = {name:"function",type:"expression",arguments:{name:name,exprs:args,ignore_type_mismatch:ignore_type_mismatch}}

  } else if (/^([a-zA-Z_]\w*)\ ([a-zA-Z_]\w*)(?:\s*\=\s*([^=].*))?$/.test(input)) { // [type] [name] (= <expression>)
    let matches = /^([a-zA-Z_]\w*)\ ([a-zA-Z_]\w*)(?:\s*\=\s*([^=].*))?$/.exec(input)
    let type = matches[1]
    let name = matches[2]
    assert_valid_name(name)

    let expr
    let expr_string = matches[3]
    if (expr_string !== undefined) {
      expr = tokenise(expr_string, line)
    }
    token = {name:"type_name_assignment_tuple", type:"command", arguments:{name:name,type:type,expr:expr}}

  } else if (/^(\(.*\))?(\[.*\])$/.test(input)) {                          //array of expressions
    let matches = /^(\(.*\))?(\[.*\])$/.exec(input)

    let type_string
    let size_string
    let size_token
    if (matches[1] !== undefined) {
      let type_size_string = matches[1].slice(1, -1)
      ;[type_string, size_string] = type_size_string.split(",")

      if (size_string !== undefined) {
        size_token = tokenise(size_string, line)
      }
    }

    let elements_string = matches[2].slice(1, -1)
    let elements_array = elements_string.split(",")
    let token_array = []

    if (elements_string !== "") {
      for (let item of elements_array) {
        token_array.push(tokenise(item,line))
      }
    }

    token = {name:"expr_array",type:"expression",
      arguments:{
      exprs:token_array,
      type: type_string,
      size: size_token
    }}

  } else if (/^(\S*) *(>>|<<|!=|<=|>=|\+|\-|\*|\/|\!|\<|\>|\&|\^|\||\%|==) *(\S*)$/.test(input)) {          // is an expression
    let matches = /^(\S*) *(>>|<<|!=|<=|>=|\+|\-|\*|\/|\!|\<|\>|\&|\^|\||\%|==) *(\S*)$/.exec(input)

    let [, expr1_text, operator, expr2_text] = matches
    const dual_operand = ["+", "-", "/", "*", "^", "%", ">", "<","==","!=", "&", ">=", "<=", "|", ">>", "<<"]
    const single_operand = ["!"]

    if (dual_operand.includes(operator)) {
      let expr1 = tokenise(expr1_text, line)
      let expr2 = tokenise(expr2_text, line)
      token = { name:operator, type: "expression", arguments: { expr1:expr1, expr2:expr2 }}

    } else if (single_operand.includes(operator)) {
      let expr
      if (expr1_text !== "") {
        expr = tokenise(expr1_text, line)
      } else {
        expr = tokenise(expr2_text, line)
      }
      token = { name:operator, type: "expression", arguments: { expr:expr } }

    } else {
      throw new CompError(`Unknown operator '${operator}'`)
    }

  } else if (/(^true$)|(^false$)/.test(input)) {    //is true/false (the reserved keywords for bool data type)
    token = {name:"bool",type:"expression",arguments:{value:input}}

  } else if (/^([a-zA-Z_]\w*)$/.test(input) ) {                       //variable or const (by name)
    token = {name:"var_or_const",type:"expression",arguments:{name:input}}

  } else if (/^([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)$/.test(input)) {
    let matches = /^([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)$/.exec(input)

    let name = tokenise(matches[1], line)
    let member = matches[2]
    token = {name:"struct_member_val", type:"expression", arguments:{name:name,member:member}}

  } else {
    throw new CompError(`Invalid syntax: '${input}'`)
  }

  token.line = line
  return token
}

function translate(token, ctx_type) {
  let args = token.arguments
  if (token.type === "command") {

    let result = []
    switch(token.name) {

    case "asm": {
      let words = args.value.split(" ")

      words = replace_var_references(words)

      result = [words.join(" ")]
    } break

    case "var_alloc": {    //var [name] [type] <expr>
      // arrays require a different allocation method
      if (args.type === "array") {
        token.name = "var_array_alloc"
        result = translate(token)
        break
      }

      assert_valid_datatype(args.type)

      let allocator, scope, prefix
      if (args.global) {
        assert_global_name_available(args.name)
        allocator = alloc_global
        scope = "__global"
        prefix = "ram."
      } else {
        assert_local_name_available(args.name)
        allocator = alloc_stack
        scope = state.scope
        prefix = "stack."
      }

      let memory = allocator(get_data_type_size(args.type))

      // add entry to symbol table
      state.symbol_table[scope][args.name] = {
        type: "variable",
        data_type: args.type,
        specific: {
          ram_addresses: memory.slice(),
          addr_prefix: prefix
        }
      }

      if (args.expr !== undefined) {
        let [expr_prefix, expr_value, expr_type] = translate(args.expr, args.type)
        assert_compatable_types(args.type, expr_type, token.line, () => {
          throw new CompError(`Wrong data type, expected '${args.type}', got '${expr_type}'`)
        })

        // make data available
        result = expr_prefix

        for (let expr_word of expr_value) {
          result.push(`write ${expr_word} ${prefix}${memory.shift()}`)
        }
      }

    } break

    case "const_alloc": {    //const [name] [type] [expr]
    // arrays require a different allocation method
      if (args.type === "array") {
        token.name = "const_array_alloc"
        result = translate(token)
        break
      }

      assert_valid_datatype(args.type)
      assert_global_name_available(args.name)

      if (args.expr === undefined) {
        throw new CompError("Constants must be initialised")
      }

      if (!(["str", "number", "inline_asm", "expr_array"].includes(args.expr.name))) {
        throw new CompError("Constant must be static values")
      }

      let [expr_prefix, expr_value, expr_type] = translate(args.expr, args.type)
      assert_compatable_types(args.type, expr_type, token.line, () => {
        throw new CompError(`Wrong data type, expected '${args.type}', got '${expr_type}'`)
      })

      // add entry to symbol table
      state.symbol_table.__global[args.name] = {
        type: "constant",
        data_type: args.type,
        specific: {
          value: expr_value
        }
      }
    } break

    case "const_array_alloc": {
      let [expr_prefix, expr_values, expr_type] = translate(args.expr)

      if (expr_type !== "expr_array") {
        throw new CompError(`Array declarations require type 'expr_array', got '${expr_type}'`)
      }

      let [source_base_addr, current_len, max_len, data_type] = expr_values

      assert_valid_datatype(data_type)
      assert_global_name_available(args.name)

      // add to symbol table
      state.symbol_table.__global[args.name] = {
        type: "constant",
        data_type: "array",
        specific: {
          element_data_type: data_type,
          ram_addresses: [
            source_base_addr,
            current_len,
            max_len
          ]
        }
      }
    } break

    case "var_array_alloc": {
      let [expr_prefix, expr_values, expr_type] = translate(args.expr)

      if (expr_type !== "expr_array") {
        throw new CompError(`Array declarations require type 'expr_array', got '${expr_type}'`)
      }

      let [source_base_addr, current_len, max_len, data_type] = expr_values

      assert_valid_datatype(data_type)
      let element_size = get_data_type_size(data_type)

      let allocator, scope, prefix
      if (args.global) {
        assert_global_name_available(args.name)
        allocator = alloc_global
        scope = "__global"
        prefix = "ram."
      } else {
        assert_local_name_available(args.name)
        allocator = alloc_stack
        scope = state.scope
        prefix = "stack."
      }

      let array_memory = allocator(max_len * element_size + 3)

      // word | function
      //    0 | absoulte_base_addr
      //    1 | current_len
      //    2 | max_len
      //    3 | --- start of array items

      // add to symbol table
      state.symbol_table[scope][args.name] = {
        type: "variable",
        data_type: "array",
        specific: {
          element_data_type: data_type,
          addr_prefix: prefix,
          ram_addresses: array_memory
        }
      }

      let absoulte_base_addr
      if (args.global) {
        absoulte_base_addr = `ram.${array_memory[3]}`
      } else {
        let absoulte = stack_to_absolute(array_memory[3])
        result.push(...absoulte.prefix)
        absoulte_base_addr = "[alu.+]"
      }

      // write the values to memory
      if (max_len > 0) {
        result.push(`write ${absoulte_base_addr} ${prefix}${array_memory[0]}`)
      } else {
        log.warn(`line ${token.line}:\nCreating zero-length array`)
      }
      result.push(`write ${current_len} ${prefix}${array_memory[1]}`)
      result.push(`write ${max_len} ${prefix}${array_memory[2]}`)

      if (current_len > 0) {
        let base_addr = `[${prefix}${array_memory[0]}]`
        // call function to copy inital values to array
        let [call_prefix, call_value, call_type] = function_call("sys.mem_copy", [`#${source_base_addr}#`, `#${base_addr}#`, `#${current_len * element_size}#`], "u16", true)
        result.push(...call_prefix)
      }

    } break

    case "set": {            //[name] = [expr]
      let is_global
      let table_entry

      let local_table = state.symbol_table[state.scope]
      let global_table = state.symbol_table.__global

      if (args.name in local_table) {
        // this is a local variable or argument
        table_entry = local_table[args.name]
      } else if (args.name in global_table) {
        // this is a global variable
        table_entry = global_table[args.name]
      } else {
        throw new CompError(`Variable '${args.name}' is undefined`)
      }

      if (!["variable", "argument"].includes(table_entry.type)) {
        throw new CompError("Only variables and arguments can be modified")
      }

      let dst_regs = table_entry.specific.ram_addresses
      let addr_prefix = table_entry.specific.addr_prefix
      let dst_type = table_entry.data_type

      // get the value and type of the expression
      let [prefix, value, expr_type] = translate(args.expr, dst_type)
      assert_compatable_types(dst_type, expr_type, token.line, () => {
        throw new CompError(`Variable expected type '${dst_type}', got '${expr_type}'`)
      })

      // run the code state.required by the expression
      result = prefix

      // copy the new value into the variable's memory
      for (let i = 0; i < dst_regs.length; i++) {
        result.push(`write ${value[i]} ${addr_prefix}${dst_regs[i]}`)
      }
    } break

    case "pointer_set": {            //*[pointer] = [expr]
      let [expr_prefix, expr_value, expr_type] = translate(args.expr)
      let size = get_data_type_size(expr_type)

      // run code state.required by expression
      result = expr_prefix

      let ptr_expr = tokenise(args.name)
      let [ptr_prefix, ptr_value, ptr_type] = translate(ptr_expr)

      if (ptr_type !== "u16") {
        throw new CompError(`Pointers must be of type 'u16', got ${ptr_type}`)
      }

      log.debug(`Writing '${expr_type}' to a pointer`)

      result.push(`write ${expr_value[0]} ${ptr_value[0]}`)

      // copy the rest of the words if the data type is more than one word long
      if (size > 1) {
        result.push(`write ${ptr_regs[0]} alu.1`)
        for (let i = 1; i < size; i++) {
          result.push(`write ${i} alu.2`)
          result.push(`write ${expr_value[i]} [alu.+]`)
        }
      }

    } break

    case "array_set": {
      let operation = args.operation
      let array = get_array_info(args.name)
      array.assert_writeable()

      // get the value of the index expression
      let [index_prefix, index_value, index_type] = translate(args.index_expr, "u16")
      assert_compatable_types(index_type, "u16", token.line, () => {
        throw new CompError(`Array index expected type 'u16', got '${index_type}'`)
      })
      result.push(...index_prefix)

      //evaluate the expression and put the result in a buffer area
      let [expr_prefix, expr_values, expr_type] = translate(args.expr, array.array_type)
      assert_compatable_types(array.array_type, expr_type, token.line, () => {
        throw new CompError(`Array expected type '${array.array_type}', got '${expr_type}'`)
      })
      result.push(...expr_prefix)

      let memory = alloc_global(array.item_size)
      let buffer = memory.slice()
      let source_addr = `ram.${memory[0]}`

      // copy expression into buffer area
      for (let word of expr_values) {
        result.push(`write ${word} ram.${buffer.shift()}`)
      }

      // fast path for single word items
      if (array.item_size === 1) {
        // buffer the index value (in case it is still in the alu)
        let buffer = buffer_if_needed(index_value)
        result.push(...buffer.prefix)
        result.push(`write ${array.base_addr} alu.1`)
        result.push(`write ${buffer.label} alu.2`)
        result.push(`write [${source_addr}] [alu.+]`)
        buffer.free()
      } else {
        // slower path using mem_copy for >1 word data types
        let [call_prefix,,] = function_call("sys.array_set", [`#${array.base_addr}#`, `#${array.item_size}#`, `#${index_value}#`, `#${source_addr}#`], "u16", true)
        result.push(...call_prefix)
      }

      // free_global(memory) might corrupt 1st stack frame
    } break

    case "struct_member_set": {
      if (!(args.name in state.symbol_table[state.scope])) {
        throw new CompError(`Struct '${args.name}' is undefined`)
      }

      let table_entry = state.symbol_table[state.scope][args.name]
      let struct_type = table_entry.data_type
      let member_addrs = table_entry.specific.ram_addresses

      let members = state.struct_definitions[struct_type].members

      let member_name = args.member

      if (!(args.member in members)) {
        throw new CompError(`Struct of type '${struct_type}' has no member '${args.member}'`)
      }

      let member_info = members[member_name]
      let member_type = member_info.data_type

      let range_start = member_info.offset
      let range_end = range_start + get_data_type_size(member_type)

      let target_addrs = []
      for (let i = range_start; i < range_end; i++) {
        target_addrs.push(member_addrs[i])
      }

      let [expr_prefix, expr_value, expr_type] = translate(args.expr, member_type)
      assert_compatable_types(member_type, expr_type, token.line, () => {
        throw new CompError(`Struct member '${member_name}' requires type '${member_type}', got '${expr_type}'`)
      })

      result.push(...expr_prefix)

      for (let i = 0; i < expr_value.length; i++) {
        result.push(`write ${expr_value[i]} stack.${target_addrs[i]}`)
      }
    } break

    case "array_function": {
      let array_name = args.name
      let operation = args.operation

      let array = get_array_info(array_name)
      array.assert_writeable()

      if (operation === "append") {
        // append just puts the given value at the current end of the list, then adds 1 to the size of the list

        // put item at the specified index by evaluating a set token
        let set_token = {name:"array_set",type:"command",arguments:{
          name: array_name,
          index_expr: {
            name:"array_expression",
            type:"expression",
            arguments:{
              name:array_name,
              operation:"len"}
            },
          expr: args.exprs[0]
        }}
        result.push(...translate(set_token))

        // increment the curret length of the array to reflect the change
        result.push(`write ${array.current_len} alu.1`)
        result.push("write 1 alu.2")
        result.push(`write [alu.+] ${array.current_len.slice(1, -1)}`)

      } else if (operation === "insert") {
        let [index_expression, item_expression] = args.exprs

        //evaluate the expression that gives the index
        let [index_prefix, index_value, index_type] = translate(index_expression, "u16")
        assert_compatable_types(index_type, "u16", token.line, () => {
          throw new CompError(`Array index expected type 'u16', got '${index_type}'`)
        })
        result.push(...index_prefix)

        let [call_prefix,,] = function_call("sys.array_shift", [`#${array.base_addr}#`, `#${array.item_size}#`, `#${index_value}#`, `#${array.current_len}#`], "u16", true)
        result.push(...call_prefix)

        // put item at the specified index
        let set_token = {name:"array_set",type:"command",arguments:{
          name: array_name,
          index_expr: index_expression,
          expr: item_expression
        }}
        result.push(...translate(set_token))

        //add one to length
        result.push(`write ${array.current_len} alu.1`)
        result.push("write 1 alu.2")
        result.push(`write [alu.+] ${array.current_len.slice(1, -1)}`)
      } else {
        throw new CompError("not implemented")
      }
    } break

    case "delete": {          //free [name]
      let table_entry
      let is_global = false

      if (args.name in state.symbol_table[state.scope])  {
        // it's a local symbol
        table_entry = state.symbol_table[state.scope][args.name]
      } else if (args.name in state.symbol_table.__global) {
        // it's a global symbol
        table_entry = state.symbol_table.__global[args.name]
        is_global = true
      } else {
        // it does not exist
        throw new CompError(`Variable '${args.name}' is undefined`)
      }

      if (table_entry.type !== "variable") {
        throw new CompError(`'${args.name}' is not a variable and cannot be freed`)
      }

      let addrs = []
      if (table_entry.data_type === "array") {
        addrs.push(table_entry.specific.base_addr)
        addrs.push(table_entry.specific.current_len)
        addrs.push(table_entry.specific.max_len)
        addrs.push(...table_entry.specific.array_mem)
      } else {
        addrs = table_entry.specific.ram_addresses
      }

      if (is_global) {
        free_global(addrs)
      } else {
        free_stack(addrs)
      }

      delete state.symbol_table[state.scope][args.name]
    } break

    //all the cmds below are just shortcuts for set tokens
    //i.e. a++    becomes a = a + 1
    case "increment_1": { //[name]++
      result = operation_assignment_token(args.name, "+", tokenise("1"))
    } break

    case "decrement_1": { //[name]--
      result = operation_assignment_token(args.name, "-", tokenise("1"))
    } break

    case "addition_assignment": { //[name] += [expr]
      result = operation_assignment_token(args.name, "+", args.expr)
    } break

    case "subtraction_assignment": { //[name] -= [expr]
      result = operation_assignment_token(args.name, "-", args.expr)
    } break

    case "multiplication_assignment": { //[name] *= [expr]
      result = operation_assignment_token(args.name, "*", args.expr)
    } break

    case "division_assignment": { //[name] /= [expr]
      result = operation_assignment_token(args.name, "/", args.expr)
    } break

    case "modulo_assignment": { //[name] %= [expr]
      result = operation_assignment_token(args.name, "%", args.expr)
    } break

    case "comment": {   // comment (begins with //)
      result = [args.comment]
    } break

    case "return": {     //return [optional expr]
      if (state.scope === "__root") {
        throw new CompError("Statement 'return' can only be used in functions")
      }

      let table_entry = state.function_table[state.scope]
      let func_type = table_entry.data_type
      let force_cast = table_entry.force_cast
      if (func_type === "none" && args.expr !== undefined) {
        throw new CompError(`Functions of type '${func_type}' cannot return values`)
      }

      // if the return statement should have an expression, evaluate it
      if (func_type !== "none") {

        if (args.expr === undefined) {
          throw new CompError(`${state.scope}() is of type '${func_type}' and must return a value`)
        }

        if (args.expr.name === "var_or_const" && args.expr.arguments.name == "__return") {
          // the __return special variable already points to the return_buffer so we don't need to copy
          result.push(RETURN_INSTRUCTION)
          break;
        }

        let [prefix, value, expr_type] = translate(args.expr, func_type)

        if (force_cast) {
          // cast any return expression to this type, ignoring any mis-match
          log.warn(`line ${token.line}:\nCasting return expression of type '${expr_type}' to '${func_type}'`)
        } else {
          assert_compatable_types(func_type, expr_type, token.line, () => {
            throw new CompError(`${state.scope}() is of type '${func_type}', but return statement got '${expr_type}'`)
          })
        }

        // include the code to evaluate the expression
        result = prefix

        // copy result into return buffer
        let return_buffer = table_entry.return_value
        for (let i = 0; i < value.length; i++) {
          result.push(`write ${value[i]} stack.${return_buffer[i]}`)
        }
      }

      // add the actual return instruction
      result.push(RETURN_INSTRUCTION)
    } break

    case "include": {
      if (args.name === "*") {
        for (let name in libs) {
          load_lib(name)
        }
      } else {
        load_lib(args.name)
      }
    } break

    case "break": {
      if (state.inner_structure_label === null) {
        throw new CompError("'break' can only be used in for/while loops")
      }
      result.push(`goto ${state.inner_structure_label}_end 0`)
    } break

    case "continue": {
      if (state.inner_structure_label === null) {
        throw new CompError("'continue' can only be used in for/while loops")
      }
      result.push(`goto ${state.inner_structure_label}_cond 0`)
    } break

    case "signature_def": {
      // signature definitions are commands (therefore are not followed by and indent)
      // however, we want to use the function definition token (which does expect an indent)
      // so we rename this token and run that instead
      token.name = "function_def_by_signature"
      token.type = "structure"
      translate(token)
    } break

    default:
      throw new CompError(`Error translating command:\nUnknown type '${token.name}'`)
    }
    return result

  } else if (token.type === "expression") {

    let prefix = []
    let registers = [""]
    let type = ctx_type
    switch (token.name) {

    case "inline_asm": {
      registers = replace_var_references(args.value.split(","))

      if (registers.length == 1) {
        type = "u16"
      } else if (registers.length == 2) {
        type = "u32"
      }
    } break

    // number types
    case "number":  { // a generic number that can be turned into the type state.required by the context
      if (ctx_type === undefined) {
        log.warn(`line ${token.line}:\nNo context-specified type for '${args.value}'\nassuming '${args.type_guess}'`)
        type = args.type_guess
      } else {
        type = ctx_type
      }

      let num_token = { name: type, type: "expression", arguments: { value: args.value } }
      let [expr_prefix, expr_value] = translate(num_token, type)
      prefix = expr_prefix
      registers = expr_value
    } break

    case "bool": {
      if (args.value === "true") {
        registers = ["1"] // true
      } else if (args.value === "false") {
        registers = ["0"] // false
      } else {
        throw new CompError("Invalid input for type 'bool'")
      }

      type = "bool"
    } break

    case "u16": {
      if (!/(^[+]?\d+$)|(^0b[10]+$)|(^0x[0-9a-fA-F]+$)/.test(args.value)) {
        throw new CompError("Invalid input for type 'u16'")
      }

      let dec_val = parse_int(args.value)

      if (dec_val > 65535) {
        throw new CompError("Integer too large (2^16 / 65535 max)")
      }

      type = "u16"
      registers = [args.value]
    } break

    case "s16": {
      if (!/(^[+-]?\d+$)|(^-?0b[10]+$)|(^-?0x[0-9a-fA-F]+$)/.test(args.value)) {
        throw new CompError("Invalid input for type 's16'")
      }

      let negative = false
      if (args.value.startsWith("-")) {
        args.value = args.value.substring(1)
        negative = true
      }

      let dec_val = parse_int(args.value)

      if (dec_val > 32767) {
        throw new CompError("Signed integer out of range (± 2^15 / 32767 max)")
      }

      if (dec_val === 0) {
        negative = false
      }

      let bin = 0

      if (negative) {
        bin = (0xffff - dec_val + 1).toString(2)
      } else {
        bin = dec_val.toString(2)
      }
      let word = `0b${pad(bin,16)}`

      type = "s16"
      registers = [word]
    } break

    case "u32": {
      if (!/(^[+]?\d+$)|(^0b[10]+$)|(^0x[0-9a-fA-F]+$)/.test(args.value)) {
        throw new CompError("Invalid input for type 'u32'")
      }

      let dec_val = parse_int(args.value)

      if (dec_val > 4294967295) {
        throw new CompError("Integer out of range (2^32 / 4.29bn max)")
      }
      let bin = pad(dec_val.toString(2),32)
      let high = `0b${bin.substring(0,16)}`
      let low = `0b${bin.substring(16,32)}`

      type = "u32"
      registers = [high,low]
    } break

    case "s32": {
      if (!/(^[+-]?\d+$)|(^-?0b[10]+$)|(^-?0x[0-9a-fA-F]+$)/.test(args.value)) {
        throw new CompError("Invalid input for type 's32'")
      }

      let negative = false
      if (args.value.startsWith("-")) {
        args.value = args.value.substring(1)
        negative = true
      }

      let dec_val = parse_int(args.value)

      if (dec_val === 0) {
        negative = false
      }

      if (dec_val > 2147483647) {
        throw new CompError("Signed integer out of range (± 2^31 / 2.15bn max)")
      }

      let bin = 0

      if (negative) {
        bin = (0xffffffff - dec_val + 1).toString(2)
      } else {
        bin = dec_val.toString(2)
      }

      bin = pad(bin,32)
      let high = `0b${bin.substring(0,16)}`
      let low = `0b${bin.substring(16,32)}`

      registers = [high,low]
      type = "s32"
    } break

    case "float": {
      throw new CompError("Type 'float' not implemented")
      type = "float"
    } break

    case "str": {
      if (args.value[0] !==  "\"" || args.value[args.value.length-1] !==  "\"") {
        throw new CompError("Strings must be quoted")
      }
      let string = args.value.slice(1,-1)

      let id = `str_${gen_label("str")}`

      state.data.push(`${id}:`)

      for (let i = 0; i < string.length; i++) {
        let char = string[i]
        let code = char.charCodeAt(0)
        if (code < 32 || code > 127) {
          throw new CompError(`'${char}' is not a valid character`)
        }
        state.data.push(code)
      }

      // string terminator
      state.data.push(0)

      registers = [id]
      type = "str"
    } break

    case "bracket": {
      throw new CompError("Not implemented")
    } break

    case "+": {
      type = find_type_priority(args.expr1, args.expr2, ctx_type)
      switch (type) {
        case "u16":
        case "s16": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          registers = ["[alu.+]"]
        } break

        case "s32":
        case "u32": {
          [prefix, registers] = function_call("sys.u32_add", [args.expr1,args.expr2], type)
        } break

        default: throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "-": {
      type = find_type_priority(args.expr1, args.expr2, ctx_type)
      switch (type) {
        case "s16":
        case "u16": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          registers = ["[alu.-]"]
        } break

        case "s32":
        case "u32": {
          [prefix, registers] = function_call("sys.u32_subtract", [args.expr1,args.expr2], type)
        } break

        default: throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "*": {
      type = find_type_priority(args.expr1, args.expr2, ctx_type)
      switch (type) {
        case "s32":
        case "u32":
        case "s16":
        case "u16": {
          [prefix, registers] = function_call(`sys.${ctx_type}_multiply`, [args.expr1,args.expr2], type)
        } break

        default: throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "/": {
      type = find_type_priority(args.expr1, args.expr2, ctx_type)
      switch (type) {
        case "s32":
        case "u32":
        case "s16":
        case "u16": {
          [prefix, registers] = function_call(`sys.${ctx_type}_divide`, [args.expr1,args.expr2], type)
        } break

        default: throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "^": {
      type = find_type_priority(args.expr1, args.expr2, ctx_type)
      switch (type) {
        case "s32":
        case "u32":
        case "s16":
        case "u16": {
          [prefix, registers] = function_call(`sys.${ctx_type}_exponent`, [args.expr1,args.expr2], type)
        } break

        default: throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "%": {
      type = find_type_priority(args.expr1, args.expr2, ctx_type)
      switch (type) {
        case "s32":
        case "u32":
        case "s16":
        case "u16": {
          [prefix, registers] = function_call(`sys.${ctx_type}_modulo`, [args.expr1,args.expr2], type)
        } break

        default: throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case ">": {
      let operand_type = find_type_priority(args.expr1, args.expr2)
      switch (operand_type) {
        case "u16": {
          prefix = write_operands(args.expr1, args.expr2, operand_type)
          registers = ["[alu.>]"]
        } break

        case "s16": {
          let [temp1, temp2] = [get_temp_word(),  get_temp_word()]
          prefix.push(`write 0b1000000000000000 alu.2`)
          prefix.push(...write_operand(args.expr1, operand_type))
          prefix.push(`write [alu.+] ${temp1.label}`)
          prefix.push(...write_operand(args.expr2, operand_type))
          prefix.push(`write [alu.+] ${temp2.label}`)
          prefix.push(`write [${temp1.label}] alu.1`)
          prefix.push(`write [${temp2.label}] alu.2`)
          registers = ["[alu.>]"]
          temp1.free()
          temp2.free()
        } break

        case "s32":
        case "u32": {
          [prefix, registers] = function_call(`sys.${operand_type}_greater`, [args.expr1,args.expr2], operand_type)
        } break

        default: throw new CompError(`Unsupported datatype '${operand_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break

    case "<": {
      let operand_type = find_type_priority(args.expr1, args.expr2)
      switch (operand_type) {
        case "u16": {
          prefix = write_operands(args.expr1, args.expr2, operand_type)
          registers = ["[alu.<]"]
          } break

        case "s16": {
          let [temp1, temp2] = [get_temp_word(),  get_temp_word()]
          prefix.push(`write 0b1000000000000000 alu.2`)
          prefix.push(...write_operand(args.expr1, operand_type))
          prefix.push(`write [alu.+] ${temp1.label}`)
          prefix.push(...write_operand(args.expr2, operand_type))
          prefix.push(`write [alu.+] ${temp2.label}`)
          prefix.push(`write [${temp1.label}] alu.1`)
          prefix.push(`write [${temp2.label}] alu.2`)
          registers = ["[alu.<]"]
          temp1.free()
          temp2.free()
          } break

          case "s32":
          case "u32": {
            [prefix, registers] = function_call(`sys.${operand_type}_less`, [args.expr1,args.expr2], operand_type)
          } break

        default: throw new CompError(`Unsupported datatype '${operand_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break

    case ">=": {
      let operand_type = find_type_priority(args.expr1, args.expr2)
      switch (operand_type) {
        case "u16": {
          let temp_vars = [get_temp_word(), get_temp_word()]

          prefix = write_operands(args.expr1, args.expr2, operand_type)
          prefix.push(`write [alu.=] ${temp_vars[0].label}`)
          prefix.push(`write [alu.>] ${temp_vars[1].label}`)
          prefix.push(`write [${temp_vars[0].label}] alu.1`)
          prefix.push(`write [${temp_vars[1].label}] alu.2`)
          registers = ["[alu.|]"]

          temp_vars[0].free()
          temp_vars[1].free()
          } break

        case "s16": {
          let [temp1, temp2] = [get_temp_word(),  get_temp_word()]
          prefix.push(`write 0b1000000000000001 alu.2`)
          prefix.push(...write_operand(args.expr1, operand_type))
          prefix.push(`write [alu.+] ${temp1.label}`)
          prefix.push(`write 0b1000000000000000 alu.2`)
          prefix.push(...write_operand(args.expr2, operand_type))
          prefix.push(`write [alu.+] ${temp2.label}`)
          prefix.push(`write [${temp1.label}] alu.1`)
          prefix.push(`write [${temp2.label}] alu.2`)
          registers = ["[alu.>]"]
          } break

        case "s32":
        case "u32": {
          let temp_vars = [get_temp_word(), get_temp_word()]

          let prefix_and_value = function_call(`sys.${operand_type}_greater`, [args.expr1,args.expr2], operand_type)
          prefix = prefix_and_value[0]

          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[0].label}`)

          prefix_and_value = function_call("sys.u32_equal", [args.expr1,args.expr2], operand_type)
          prefix.push(...prefix_and_value[0])
          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[1].label}`)

          prefix.push(`write [${temp_vars[0].label}] alu.1`)
          prefix.push(`write [${temp_vars[1].label}] alu.2`)
          registers = ["[alu.|]"]

          temp_vars[0].free()
          temp_vars[1].free()
          } break

        default: throw new CompError(`Unsupported datatype '${operand_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break

    case "<=": {
      let operand_type = find_type_priority(args.expr1, args.expr2)
      switch (operand_type) {
        case "u16": {
          let temp_vars = [get_temp_word(), get_temp_word()]

          prefix = write_operands(args.expr1, args.expr2, operand_type)
          prefix.push(`write [alu.=] ${temp_vars[0].label}`)
          prefix.push(`write [alu.<] ${temp_vars[1].label}`)
          prefix.push(`write [${temp_vars[0].label}] alu.1`)
          prefix.push(`write [${temp_vars[1].label}] alu.2`)
          registers = ["[alu.|]"]

          temp_vars[0].free()
          temp_vars[1].free()
          } break

        case "s16": {
          let [temp1, temp2] = [get_temp_word(),  get_temp_word()]
          prefix.push(`write 0b1000000000000000 alu.2`)
          prefix.push(...write_operand(args.expr1, operand_type))
          prefix.push(`write [alu.+] ${temp1.label}`)
          prefix.push(`write 0b1000000000000001 alu.2`)
          prefix.push(...write_operand(args.expr2, operand_type))
          prefix.push(`write [alu.+] ${temp2.label}`)
          prefix.push(`write [${temp1.label}] alu.1`)
          prefix.push(`write [${temp2.label}] alu.2`)
          registers = ["[alu.<]"]
          temp1.free()
          temp2.free()
          } break

        case "s32":
        case "u32": {
          let temp_vars = [get_temp_word(), get_temp_word()]

          let prefix_and_value = function_call(`sys.${operand_type}_less`, [args.expr1,args.expr2], operand_type)
          prefix = prefix_and_value[0]

          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[0].label}`)

          prefix_and_value = function_call("sys.u32_equal", [args.expr1,args.expr2], operand_type)
          prefix.push(...prefix_and_value[0])
          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[1].label}`)

          prefix.push(`write [${temp_vars[0].label}] alu.1`)
          prefix.push(`write [${temp_vars[1].label}] alu.2`)
          registers = ["[alu.|]"]

          temp_vars[0].free()
          temp_vars[1].free()
          } break

        default: throw new CompError(`Unsupported datatype '${operand_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break

    case "==": {
      let operand_type = find_type_priority(args.expr1, args.expr2)
      switch (operand_type) {
        case "bool":
        case "u16":
        case "s16": {
          prefix = write_operands(args.expr1, args.expr2, operand_type)
          registers = ["[alu.=]"]
        } break

        case "s32":
        case "u32": {
          [prefix, registers] = function_call("sys.u32_equal", [args.expr1,args.expr2], operand_type)
        } break

        default: throw new CompError(`Unsupported datatype '${operand_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break

    case "!=": {
      let operand_type = find_type_priority(args.expr1, args.expr2)
      switch (operand_type) {
        case "bool":
        case "u16":
        case "s16": {
          let buffer = get_temp_word()
          prefix = write_operands(args.expr1, args.expr2, operand_type)
          prefix.push(`write [alu.=] ${buffer.label}`)
          prefix.push(`write [${buffer.label}] alu.1`)
          buffer.free()
          registers = ["[alu.!]"]
        } break

        case "s32":
        case "u32": {
          [prefix, registers] = function_call("sys.u32_not_equal", [args.expr1,args.expr2], operand_type)
        } break

        default: throw new CompError(`Unsupported datatype '${operand_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break

    case "&": {
      prefix = write_operands(args.expr1,args.expr2,ctx_type)
      registers = ["[alu.&]"]
    } break

    case "|": {
      prefix = write_operands(args.expr1,args.expr2,ctx_type)
      registers = ["[alu.|]"]
    } break

    case ">>": {
      if (!(["number"].includes(args.expr2.name))) {
        throw new CompError("Number of places to shift must be static")
      }
      let num_places = parseInt(args.expr2.arguments.value)
      let data_type_size = get_data_type_size(ctx_type)
      let bits = data_type_size * 16

      if (num_places < 0) {
        throw new CompError("Number of places to shift must be static")
      } else if (num_places == 0 || num_places >= bits) {
        registers = Array(data_type_size).fill("0")
        break
      }

      switch (ctx_type) {
        case "u16": {
          prefix = write_operand(args.expr1,ctx_type)

          let temp_word = get_temp_word()
          while (num_places > 1) {
            prefix.push(`write [alu.>>] ${temp_word.label}`)
            prefix.push(`write [${temp_word.label}] alu.1`)
            num_places--
          }
          temp_word.free()

          registers = ["[alu.>>]"]
        } break

        case "u32":
        case "s32":
        case "s16": {
          if (num_places > 1) {
            // allocate buffer for intermediate values
            let buffer = alloc_stack(data_type_size)
            let buffer_values = buffer.map((addr) => {return `[stack.${addr}]`})
            let buffer_as_arg = `#${buffer_values.join(",")}#`

            // write operand to buffer
            let [op_prefix, op_value] = translate(args.expr1, ctx_type)
            prefix.push(...op_prefix)
            for (let i = 0; i < data_type_size; i++) {
              prefix.push(`write ${op_value[i]} stack.${buffer[i]}`)
            }

            // repeatedly shift the content of the buffer and write the result into the buffer
            while (num_places > 0) {
              let [call_prefix, call_registers] = function_call(`sys.${ctx_type}_rshift`, [buffer_as_arg], ctx_type, true)
              prefix.push(...call_prefix)
              for (let i = 0; i < data_type_size; i++) {
                prefix.push(`write ${call_registers[i]} stack.${buffer[i]}`)
              }
              num_places--
            }

            registers = buffer_values
          } else {
            [prefix, registers] = function_call(`sys.${ctx_type}_rshift`, [args.expr1], ctx_type)
          }
        } break

        default: throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "<<": {
      if (!(["number"].includes(args.expr2.name))) {
        throw new CompError("Number of places to shift must be static")
      }
      let num_places = parseInt(args.expr2.arguments.value)
      let data_type_size = get_data_type_size(ctx_type)
      let bits = data_type_size * 16

      if (num_places < 0) {
        throw new CompError("Number of places to shift must be static")
      } else if (num_places == 0 || num_places >= bits) {
        registers = Array(data_type_size).fill("0")
        break
      }

      switch (ctx_type) {
        case "u16":
        case "s16": {
          prefix = write_operand(args.expr1,ctx_type)

          let temp_word = get_temp_word()
          while (num_places > 1) {
            prefix.push(`write [alu.<<] ${temp_word.label}`)
            prefix.push(`write [${temp_word.label}] alu.1`)
            num_places--
          }
          temp_word.free()

          registers = ["[alu.<<]"]
        } break

        case "s32":
        case "u32": {
          if (num_places > 1) {
            // allocate buffer for intermediate values
            let buffer = alloc_stack(data_type_size)
            let buffer_values = buffer.map((addr) => {return `[stack.${addr}]`})
            let buffer_as_arg = `#${buffer_values.join(",")}#`

            // write operand to buffer
            let [op_prefix, op_value] = translate(args.expr1, ctx_type)
            prefix.push(...op_prefix)
            for (let i = 0; i < data_type_size; i++) {
              prefix.push(`write ${op_value[i]} stack.${buffer[i]}`)
            }

            // repeatedly shift the content of the buffer and write the result into the buffer
            while (num_places > 0) {
              let [call_prefix, call_registers] = function_call(`sys.u32_lshift`, [buffer_as_arg], ctx_type, true)
              prefix.push(...call_prefix)
              for (let i = 0; i < data_type_size; i++) {
                prefix.push(`write ${call_registers[i]} stack.${buffer[i]}`)
              }
              num_places--
            }

            registers = buffer_values
          } else {
            [prefix, registers] = function_call(`sys.u32_lshift`, [args.expr1], ctx_type)
          }
        } break

        default: throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "!": {
      prefix = write_operand(args.expr,ctx_type)
      registers = ["[alu.!]"]
    } break

    case "expr_array": {
      let label = `expr_array_${gen_label("expr_array")}`

      let contained_type = args.type
      if (contained_type === undefined) {
        if (args.exprs.length > 0) {
          contained_type = args.exprs[0].arguments.type_guess
          log.warn(`line ${token.line}:\nInferring type as '${contained_type}' from first element of array`)
        } else {
          throw new CompError("Empty arrays must have a type specified")
        }
      }

      let max_length
      if (args.size === undefined) {
        max_length = args.exprs.length
        log.warn(`line ${token.line}:\nInferring max. length as '${max_length}' from number of expressions`)
      } else {
        max_length = get_static_value(args.size, "u16", () => {
          throw new CompError("Array size must be static & of type 'u16'")
        })
      }

      let length = args.exprs.length

      let item_size = get_data_type_size(contained_type)
      let consts_to_add = [`${label}:`]

      let prefix_and_value
      for (let item of args.exprs) {
        prefix_and_value = translate(item,contained_type)
        if (prefix_and_value[0].length !==  0 ) {
          throw new CompError("Expressions in an array decleration must be static")
        }
        consts_to_add.push(...prefix_and_value[1])
      }
      state.data.push(...consts_to_add)

      registers = [label, length, max_length, contained_type]
      type = "expr_array"
    } break

    case "struct_init": {
      let members = state.struct_definitions[ctx_type].members
      let num_members = Object.keys(members).length

      if (args.exprs.length !== num_members) {
        throw new CompError(`Struct '${ctx_type}' requires ${num_members} member(s), but ${args.exprs.length} were supplied`)
      }

      registers = []

      let expr_index = 0
      for (let [member_name, member_info] of Object.entries(members)) {
        let member_type = member_info.data_type
        let expr = args.exprs[expr_index]

        let [expr_prefix, expr_values, expr_type] = translate(expr, member_type)
        assert_compatable_types(member_type, expr_type, token.line, () => {
          throw new CompError(`Struct member '${member_name}' requires type '${member_type}', got '${expr_type}'`)
        })

        prefix.push(...expr_prefix)

        let size = get_data_type_size(expr_type)

        for (let i = 0; i < size; i++) {
          let value = buffer_if_needed(expr_values[i])
          prefix.push(...value.prefix)
          registers.push(value.label)
        }

        expr_index++
      }
    } break

    case "var_or_const": {
      let table_entry
      let is_global = false

      if (args.name in state.symbol_table[state.scope])  {
        // it's a local symbol
        table_entry = state.symbol_table[state.scope][args.name]
      } else if (args.name in state.symbol_table.__global) {
        // it's a global symbol
        table_entry = state.symbol_table.__global[args.name]
        is_global = true
      } else {
        // it does not exist
        throw new CompError(`Variable '${args.name}' is undefined`)
      }

      type = table_entry.data_type
      assert_valid_datatype(type)

      registers = []
      if (["variable","argument"].includes(table_entry.type)) {
        // it's a regular variable/argument
        for (let addr of table_entry.specific.ram_addresses) {
          if (is_global) {
            registers.push(`[ram.${addr}]`)
          } else {
            registers.push(`[stack.${addr}]`)
          }
        }
      } else if (table_entry.type === "constant") {
        // it's a constant
        registers = table_entry.specific.value
      } else {
        throw new CompError(`Unknown symbol type '${table_entry.type}'`)
      }

    } break

    case "struct_member_val": {
      let [struct_prefix, struct_values, struct_type] = translate(args.name)
      let members = state.struct_definitions[struct_type].members

      let member_name = args.member

      if (!(args.member in members)) {
        throw new CompError(`Struct of type '${struct_type}' has no member '${args.member}'`)
      }

      let member_info = members[member_name]
      let member_type = member_info.data_type

      let range_start = member_info.offset
      let range_end = range_start + get_data_type_size(member_type)

      registers = []
      for (let i = range_start; i < range_end; i++) {
        registers.push(struct_values[i])
      }

      type = member_type
    } break

    case "array_expression": {
      let array_name = args.name
      let operation = args.operation

      let array = get_array_info(array_name)

      if (operation === "index") {
        let [index_prefix, index_value, index_type] = translate(args.expr, "u16")
        assert_compatable_types(index_type, "u16", token.line, () => {
          throw new CompError(`Array index expected type 'u16', got '${index_type}'`)
        })
        prefix.push(...index_prefix)


        // fast path for single word items
        if (array.item_size === 1) {
          // buffer the index value (in case it is still in the alu)
          let buffer = buffer_if_needed(index_value)
          prefix.push(...buffer.prefix)

          // TODO leaks global memory
          let result = alloc_global(1)
          prefix.push(`write ${array.base_addr} alu.1`)
          prefix.push(`write ${buffer.label} alu.2`)
          prefix.push(`copy [alu.+] ram.${result}`)
          registers = [`[ram.${result}]`]
          buffer.free()
        } else {
          // slower path using mem_copy for >1 word data types
          let dest_memory = alloc_global(array.item_size)
          let abs_dest = `ram.${dest_memory[0]}`
          let [call_prefix,,] = function_call("sys.array_read", [`#${array.base_addr}#`, `#${array.item_size}#`, `#${index_value}#`, `#${abs_dest}#`], "u16", true)
          prefix.push(...call_prefix)
          registers = []
          for (let addr of dest_memory) {
            registers.push(`[ram.${addr}]`)
          }
        }
        type = array.array_type

      } else if (operation === "len") {
        registers = [array.current_len]
        type = "u16"

      } else if (operation === "max_len") {
        registers = [array.max_len]
        type = "u16"

      } else if (operation === "pop") {
        array.assert_writeable()
        // take one away from the length of the array, then return the item at that index
        prefix.push(`write ${array.current_len} alu.1`)
        prefix.push("write 1 alu.2")
        prefix.push(`write [alu.-] ${array.current_len.slice(1, -1)}`)

        // evaluate and index token instead of re-implmenting the same logic here
        let index_token = {name:"array_expression",type:"expression",arguments:{
          name: array_name,
          operation: "index",
          expr: tokenise(`{${array.current_len}}`)
          }
        }
        let [index_prefix, index_value, index_type] = translate(index_token)
        prefix.push(...index_prefix)

        registers = index_value
        type = index_type
      } else {
        throw new CompError("not implemented")
      }
    } break

    case "function": {     // function call
      // functions begining with 'sys.' will need to be loaded from the standard library first
      if (args.name.startsWith("sys.")) {
        load_lib(args.name)
      }

      let entry_point = `func_${args.name}`
      if (!(args.name in state.function_table)) {
        throw new CompError(`Function '${args.name}' is undefined`)
      }

      let table_entry = state.function_table[args.name]

      let min_arg_num = 0
      for (let [name, details] of Object.entries(table_entry.arguments)) {
        if (!details.optional) { min_arg_num++ }
      }
      let max_arg_num = Object.keys(table_entry.arguments).length
      let actual_arg_num = Object.keys(args.exprs).length

      if (actual_arg_num < min_arg_num) {
        throw new CompError(`${args.name}() requires at least ${min_arg_num} arg(s), but ${actual_arg_num} were given`)
      } else if (actual_arg_num > max_arg_num) {
        throw new CompError(`${args.name}() takes at most ${max_arg_num} arg(s), but ${actual_arg_num} were given`)
      }

      let args_processed = 0
      for (let [arg_name, details] of Object.entries(table_entry.arguments)) {
        if (args_processed == actual_arg_num) {
          // we have run out of supplied arguments
          break
        }

        let arg_type = details.data_type
        let arg_token = args.exprs.shift()

        let expr_prefix, expr_value, expr_type
        if (args.ignore_type_mismatch) {
          [expr_prefix, expr_value, expr_type] = translate(arg_token, args.forced_type)
        } else {
          [expr_prefix, expr_value, expr_type] = translate(arg_token, arg_type)
          assert_compatable_types(arg_type, expr_type, token.line, () => {
            throw new CompError(`In call to ${args.name}()\nArgument '${arg_name}' is of type '${arg_type}', but got '${expr_type}'`)
          })
        }

        // run code state.required by expression
        prefix.push(...expr_prefix)

        // copy each word into argument memory
        for (let i = 0; i < details.ram_addresses.length; i++) {
          prefix.push(`write ${expr_value[i]} stack.${details.ram_addresses[i] + frame_size(state.scope)}`)
        }

        args_processed++
      }

      // skip the initialisation of arguments that we have supplied values for
      // we do this by entering the function at a different point
      if (actual_arg_num > 0) {
        entry_point += `_${actual_arg_num}`
      }

      // actually call the function
      prefix.push(`call ${entry_point} ${frame_size(state.scope)}`)

      registers = []
      for (let addr of table_entry.return_value) {
        registers.push(`[stack.${addr + frame_size(state.scope)}]`)
      }

      if (args.ignore_type_mismatch) {
        type = ctx_type
      } else {
        type = table_entry.data_type
      }
    } break

    case "pointer_lookup": {
      let address_expr = tokenise(args.var_or_const_name)
      let [addr_prefix, addr_value, addr_type] = translate(address_expr, "u16")
      if (addr_type !== "u16") {
        throw new CompError(`Pointers must be of type 'u16', got '${addr_type}'`)
      }

      if (args.type_cast !== undefined) {
        type = args.type_cast
      } else if (ctx_type !== undefined) {
        type = ctx_type
      } else {
        log.warn(`line ${token.line}:\nNo explicit cast or context-given type for pointer lookup, defaulting to 'u16'`)
        type = "u16"
      }

      let size = get_data_type_size(type)
      let temp_buffer = alloc_stack(size)

      // make pointer value available
      prefix.push(...addr_prefix)

      // copy pointer value into temp ram word
      let buffer = buffer_if_needed(addr_value[0])
      prefix.push(...buffer.prefix)

      // lookup pointer value and copy into temp buffer
      prefix.push(`copy ${buffer.label} stack.${temp_buffer[0]}`)
      buffer.free()

      // if the target type is more than one word, copy more words
      if (size > 1) {
        prefix.push(`write ${buffer.label} alu.1`)

        for (let i = 1; i < size; i++) {
          prefix.push(`write ${i} alu.2`)
          prefix.push(`copy [alu.+] stack.${temp_buffer[i]}`)
        }
      }

      // output registers are the values of the temp buffer
      registers = []
      for (let addr of temp_buffer) {
        registers.push(`[stack.${addr}]`)
      }
    } break

    default:
      throw new CompError(`Error translating expression:\nUnknown type '${token.name}'`)
    }
    return [prefix, registers, type]

  } else if (token.type === "structure") {
    let result = []
    switch (token.name) {

    case "if": {
      let label = `if_${gen_label("if")}`

      let else_present = false
      let else_if_present = false
      let exprs = [args.expr]
      let main_tokens = [[]]
      let else_tokens = []
      let clause_number = 0
      let target = main_tokens[0]

      for (let item of token.body) {
        if (item.name === "else if") {
          clause_number++
          main_tokens.push([])
          exprs.push(item.arguments.expr)
          target = main_tokens[clause_number]
          else_if_present = true
        } else if (item.name === "else") {
          if (else_present) {
            throw new CompError("More than one else statement")
          }
          else_present = true
          target = else_tokens
        } else {
          target.push(item)
        }
      }

      for (let i = 0; i < exprs.length; i++) {
        if (i !==  0) {
          result.push(`${label}_${i}:`)
        }

        let next_case_label
        if (exprs.length === (i+1) && !else_present) {
          next_case_label = `${label}_end`
        } else {
          next_case_label = `${label}_${i+1}`
        }

        let [prefix, value, type] = translate(exprs[i], "bool")
        if (type === "u16" || type === "s16" || type === "u32" || type === "s32") {
          log.warn(`line ${token.line}:\nWhen using non-bool types as conditionals, only the least significant bit is used`)
        } else if (type === "bool") {
          // all ok
        } else {
          throw new CompError(`Conditional expression expected type 'bool', got '${type}'`)
        }
        result.push(...prefix)
        result.push(`goto ${next_case_label} ${value[value.length - 1]}`)

        result.push(...translate_body(main_tokens[i]))

        if ((else_present || else_if_present) && i !==  exprs.length) {
          result.push(`goto ${label}_end 0`)
        }
      }

      if (else_present) {
        result.push(`${label}_${exprs.length}:`)
      }
      result.push(...translate_body(else_tokens))
      result.push(`${label}_end:`)
    } break

    case "else": {
      throw new CompError("Can't evaluate 'else' flag")
    } break

    case "else if": {
      throw new CompError("Can't evaluate 'else if' flag")
    } break

    case "for": {
      let label = `for_${gen_label("for")}`
      let init_result = translate(args.init)
      result.push(...init_result)

      let expr_prefix_and_value = translate(args.expr, "bool")
      let expr_prefix = expr_prefix_and_value[0]
      let expr_value = expr_prefix_and_value[1][0]
      if (expr_prefix_and_value[2] !==  "bool") {
        throw new CompError(`Conditional expression expected type 'bool', got '${expr_prefix_and_value[2]}'`)
      }
      result.push(...expr_prefix)
      result.push(`goto ${label}_end ${expr_value}`)
      result.push([(`${label}_start:`)])

      let prev_state = state.inner_structure_label
      state.inner_structure_label = label
      result.push(...translate_body(token.body))
      result.push(`${label}_cond:`)
      state.inner_structure_label = prev_state

      let cmd_result = translate(args.cmd)
      result.push(...cmd_result)

      result.push(...expr_prefix)
      result.push(`goto ${label}_end ${expr_value}`)
      result.push(`goto ${label}_start 0`)
      result.push(`${label}_end:`)
    } break

    case "while": {
      let label = `while_${gen_label("while")}`

      let prefix_and_value = translate(args.expr, "bool")
      let prefix = prefix_and_value[0]
      let value = prefix_and_value[1][0]
      if (prefix_and_value[2] !==  "bool") {
        throw new CompError(`Conditional expression expected type 'bool', got '${prefix_and_value[2]}'`)
      }
      result.push(...prefix)
      result.push(`goto ${label}_end ${value}`)
      result.push([(`${label}_start:`)])

      let prev_state = state.inner_structure_label
      state.inner_structure_label = label
      result.push(...translate_body(token.body))
      result.push(`${label}_cond:`)
      state.inner_structure_label = prev_state

      result.push(...prefix)
      result.push(`goto ${label}_end ${value}`)
      result.push(`goto ${label}_start 0`)
      result.push(`${label}_end:`)
    } break

    case "repeat": {
      let [prefix, value, type] = translate(args.expr, "u16")

      let times_to_repeat = parseInt(value[0])

      if (times_to_repeat < 0) {
        throw new CompError("Number of times to repeat must be a positive number")
      }

      let body = translate_body(token.body)
      prefix = []

      while (times_to_repeat > 0) {
        result.push(...body)
        times_to_repeat--
      }
    } break

    case "function_def":
    case "function_def_by_signature": {
      // if the function is being defined by a signature, we don't actually compile the function
      // only enter its details in the function table so it can be called
      let is_full_definition = token.name === "function_def"

      if (is_full_definition && args.name in state.function_table && !state.function_table[args.name].fully_defined) {
        // this is the function definition for a already existing signature
        // TODO assert signature is the same for this definition (ie same args w/ same data types)
      } else if (!is_full_definition && args.name in state.function_table && state.function_table[args.name].fully_defined) {
        // this is the function signature for a already defined function
        // TODO assert signature is the same as defined function
        // also do not overwrite full definition
        break
      } else {
        // this is a stand-alone function definition, so we need to check if the name is available
        assert_global_name_available(args.name)
      }

      // init output area for generated code
      let target
      if (is_full_definition) {
        state.code[args.name] = []
        target = state.code[args.name]
      } else {
        // if this is a function signature, don't generate any code
        target = []
      }

      let label = `func_${args.name}`
      target.push(`${label}:`)

      // save previous scope for later
      let old_state = state.scope
      state.scope = args.name

      // generate free ram and symbol table for this scope
      state.frame_usage[state.scope] = []
      state.symbol_table[state.scope] = {}
      state.labels[state.scope] = {if:0,for:0,while:0,str:0,expr_array:0}

      // check function's return type
      assert_valid_datatype(args.type)

      // add entry in function table
      state.function_table[args.name] = {
        data_type: args.type,
        force_cast: args.force_cast,
        arguments: {},
        fully_defined: is_full_definition
      }

      // process argument definitions
      let arg_num = 0
      let optional_arg_encountered = false
      for (let entry of args.args) {
        if (entry.name !== "type_name_assignment_tuple") {
          throw new CompError("Only argument definitions are allowed here")
        }
        let {name, type, expr} = entry.arguments
        assert_local_name_available(name)
        assert_valid_datatype(type)

        let is_optional_arg = entry.arguments.expr !== undefined
        let size = get_data_type_size(type)

        let memory = alloc_stack(size)

        // put argument into symbol table
        state.symbol_table[args.name][name] = {
          type: "argument",
          data_type: type,
          specific: {
            ram_addresses: memory.slice(),
            addr_prefix: "stack."
          }
        }

        // add to argument table
        state.function_table[args.name].arguments[name] = {
          data_type: type,
          optional: is_optional_arg,
          ram_addresses: memory.slice()
        }

        // set default value of argument (if it has one)
        if (is_optional_arg) {
          optional_arg_encountered = true
          // only evaluate the argument's default if it is in a full function definition
          if (is_full_definition) {
            let [expr_prefix, expr_value, expr_type] = translate(expr, type)
            assert_compatable_types(type, expr_type, token.line, () => {
              throw new CompError(`Argument '${name}' is of type '${type}', but got '${expr_type}'`)
            })

            target.push(...expr_prefix)

            for (let word of expr_value) {
              target.push(`write ${word} stack.${memory.shift()}`)
            }
          }
        } else {
          if (optional_arg_encountered) {
            throw new CompError(`Non-optional arg. '${name}' cannot follow optional args`)
          }
        }

        arg_num++
        target.push(`${label}_${arg_num}:`)
      }

      // allocate space for return value (or 0 words if type is "none")
      let return_buffer = alloc_stack(get_data_type_size(args.type))
      state.function_table[args.name].return_value = return_buffer

      // add __return variable to symbol table
      // this is a special variable that represents the return buffer and it used in performance-
      // critical functions
      state.symbol_table[state.scope]["__return"] = {
        type: "argument",
        data_type: args.type,
        specific: {
          ram_addresses: return_buffer,
          addr_prefix: "stack."
        }
      }

      // indent function header
      for (let i = 1; i < target.length; i++) {
        target[i] = `  ${target[i]}`
      }

      if (is_full_definition) {
        // translate the body of the function
        target.push(...translate_body(token.body))
      }

      // restore previous state.scope
      state.scope = old_state
      log.debug(`namespace -> ${state.scope}`)

      // add return instruction unless it is already there
      if (target[target.length -1] !== `  ${RETURN_INSTRUCTION}`) {
        target.push(`  ${RETURN_INSTRUCTION}`)
      }
    } break

    case "struct_def": {
      assert_datatype_name_available(args.name)

      let members = {}
      let total_size = 0
      for (let entry of token.body) {
        if (entry.name !== "type_name_assignment_tuple") {
          throw new CompError("Only struct member definitions are permitted here")
        }
        let name = entry.arguments.name
        let type = entry.arguments.type

        if (entry.arguments.expr !== undefined) {
          throw new CompError("Struct members cannot have default values")
        }

        assert_valid_datatype(type)

        let size =  get_data_type_size(type)

        if (name in members) {
          throw new CompError(`Duplicate member name '${name}'`)
        }

        members[name] = {
          data_type: type,
          offset: total_size
        }
        total_size += size
      }

      if (total_size === 0) {
        throw new CompError("There must be at least 1 struct member")
      }

      state.struct_definitions[args.name] = {
        members: members,
        size: total_size
      }
    } break

    default:
      throw new CompError(`Error translating structure:\nUnknown type '${token.name}'`)
    }
    return result
  } else {
    throw new CompError(`Error translating token:\nUnknown type '${token.type}'`)
  }
}

function compile(input, nested) {
  //init
  if (!nested) {
    init_state()
  }

  //tokenise
  log.info("Tokenising...")

  if (input === "") {
    throw new CompError("No input", 0)
  }

  let t0 = timer()
  let tokens = []
  let prev_indent = 0
  let curr_indent = 0
  let token = {}
  let targ = [tokens]
  let expect_indent = false
  let include_block_mode = false
  for (let i = 0; i < input.length; i++) {
    let line = input[i].trim()   // remove any trailing whitesapce
    if (line === "" || line === "\n") { continue } // if it is a newline, skip it
    if (line === "###") {
      include_block_mode = ! include_block_mode
      continue
    }
    if (include_block_mode) {
      state.data.push(line)
      continue
    }

    curr_indent = Math.floor(input[i].search(/\S|$/)/2)

    if (input[i].search(/\S|$/) % 2 !==  0) {
      throw new CompError("Indents must be 2 spaces", i + 1)
    }

    if (expect_indent && !(curr_indent > prev_indent)) {
      throw new CompError("Expected indent", i + 1)
    }

    if (!expect_indent && (curr_indent > prev_indent)) {
      throw new CompError("Unexpected indent", i + 1)
    }

    if (curr_indent > prev_indent) {
      log.debug(`indent ↑ ${prev_indent} -> ${curr_indent}`)
      expect_indent = false  //we've got an indent so no need to throw an error
    } else if (curr_indent < prev_indent) {
      log.debug(`indent ↓ ${prev_indent} -> ${curr_indent}`)
      if (line.trim().startsWith("else")) {
        for (let j = 0; j < (prev_indent - curr_indent)-1; j++) {
          targ.pop()
        }
        log.debug("same target [if statement extension]")
        expect_indent = true
      } else {
        for (let j = 0; j < (prev_indent - curr_indent); j++) {
          targ.pop()             //set 'target' token to the previous one in the stack
        }
        if (targ[targ.length-1] instanceof Array) {
          log.debug("new target ↓ _root_")
        } else {
          log.debug(`new target ↓ ${targ[targ.length-1].name}`)
        }
      }
    }  // if no indnet, carry on passing into current target

    try {
      token = tokenise(line, i+1)
      if (targ[targ.length-1] instanceof Array) { //if the target is an array it is the root 'tokens' list
        targ[targ.length-1].push(token)
      } else {                                    //else it is a structure
        targ[targ.length-1].body.push(token)
      }

      if (token.type === "structure" && !(token.name in {"else":"","else if":""})) {     //when a structure header is parsed, set it to be target and expect indent
        log.debug(`new target ↑ ${token.name}`)
        expect_indent = true
        targ.push(token)
      }
    } catch (error) {
      if (error instanceof CompError) {        // if this is CompError and not a JS error
        throw new CompError(error.message, i + 1)  // add the current line number
      } else {
        throw error
      }
    }
    prev_indent = Math.floor(input[i].search(/\S|$/)/2)
  }

  let t1 = timer()
  log.info(`↳ success, ${input.length} line(s) in ${Math.round(t1-t0)} ms`)

  if (!nested) {
    state.ast = tokens
  }

  //translate
  log.info("Translating...")
  t0 = timer()

  let output = translate_body(tokens, false)
  output.push("stop 0 0")
  output.unshift(`write ${frame_size("__global")} ctl.sp`)

  t1 = timer()
  log.info(`↳ success, ${tokens.length} tokens(s) in ${Math.round(t1-t0)} ms`)

  //add state.data
  output.push(...state.data)

  //add function defs
  for (let scope in state.code) {
    output.push(...state.code[scope])
  }

  //feedback
  if (!nested) {
    let non_deallocated_vars = 0

    for (let namespace in state.symbol_table) {
      if (namespace.startsWith("sys.")) {
        continue
      }
      let symbols = state.symbol_table[namespace]
      for (let name in symbols) {
        let symbol = symbols[name]
        if (symbol.type === "variable") {
          non_deallocated_vars += 1
        }
      }
    }

    if (non_deallocated_vars > 0) {
      log.warn(`${non_deallocated_vars} variable(s) are never deallocated`)
    }

    for (let [name, table_entry] of Object.entries(state.function_table)) {
      if (!table_entry.fully_defined) {
        log.warn(`${name}() is not defined and must be linked at assemble time`)
      }
    }

    log.info(`Standard library functions used: ${state.required_libs.length}`)
  }

  return output.join("\n")
}

log.info(`Compiler thread started, ${Object.keys(libs).length} standard functions loaded`)
