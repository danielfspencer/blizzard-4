"use strict"

let state = {}
let show_log_messages = true
let debug = false
let token_dump = []
let timer

// load the standard library and define the timer function
if (typeof process !== "undefined") {
  // running in nodejs
  try {
    timer = require('performance-now')
    if (process.pkg) { // packaged nodejs mode
      let path = '/snapshot/b4c/compiler/libraries.js'
      if (process.platform === "win32") {
        path = "C:" + path
      }
      importScripts(path)
    } else {  // normal nodejs mode
      importScripts('compiler/libraries.js')
    }
  } catch (e) {throw e}
} else {
  // running in browser (the sane one)
  timer = () => performance.now()
  importScripts('libraries.js')
}

const data_type_size = {int:1,sint:1,long:2,slong:2,float:2,bool:1,str:1,array:4,none:0}
const data_type_default_value = {int:"0",sint:"0",long:"0",slong:"0",float:"0",bool:"false",str:"\"\""}
const reserved_keywords = {"if":"","for":"","while":"","def":"","true":"","false":"","sys.odd":"","sys":"","array":"","return":"","break":"","continue":""}

onmessage = (msg) => {
  switch(msg.data[0]) {
    case "compile":
      let result = ""
      try {
        let as_array = msg.data[1].split('\n')
        result = compile(as_array, false)
      } catch (error) {
        if (error instanceof CompError) {
          log.error(error.toString())
        } else {
          throw error
        }
      } finally {
        let ast = JSON.stringify(token_dump, null, 2)
        postMessage(["result", result, ast])
      }
      break
    case "debug":
      debug = msg.data[1]
      break
    case "bench":
      try {
        log.info(`${benchmark(msg.data[1])} lines/second`)
      } catch (error) {
        if (error instanceof CompError) {
          log.error("Benchmark could not be run because the standard library did not compile:")
          log.error(error.toString())
        } else {
          throw error
        }
      }
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
  if (level != "error" && !show_log_messages || (level == "debug" && !debug)) {
    return
  }

  let text
  if (typeof message == "object") {
    text = JSON.stringify(message)
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

function init_vars() {
  state = {
    scope: "[root]",
    symbol_table: {"[root]":{},"[global]":{}},
    free_ram: {"[root]":gen_free_ram_map(),"[global]":gen_free_ram_map()},
    function_table: {},
    consts: [],
    funcs: {},
    required: {},
    max_allocated_ram_slots: 0,
    inner_structure_label: undefined,
    ids: {if:0,for:0,while:0,str:0,expr_array:0}
  }
}

function pad(string, width) {
 return string.length >= width ? string : new Array(width - string.length + 1).join("0") + string
}

function CSVToArray(strData, strDelimiter){
  if (strData == "") {return []}
  strDelimiter = (strDelimiter || ",")
  let objPattern = new RegExp(
    ( "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
     "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
     "([^\"\\" + strDelimiter + "\\r\\n]*))" ),
     "gi" )
  let arrData = [[]]
  let arrMatches = null
  while (arrMatches = objPattern.exec( strData )){
    let strMatchedDelimiter = arrMatches[ 1 ]
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter){
      arrData.push([])
    }
    let strMatchedValue
    if (arrMatches[2]){
      strMatchedValue = arrMatches[2].replace(
        new RegExp("\"\"", "g"),
        "\"")
    } else {
      strMatchedValue = arrMatches[3]
    }
    arrData[arrData.length-1].push(strMatchedValue)
  }
  return(arrData)
}

function benchmark(iterations) {
  postMessage(["update",-1])

  let lines = 0
  for (let lib of Object.values(libs)) {
    lines += lib.length
  }

  let total_time = 0
  for (let i = 0; i < iterations; i++) {
    init_vars()
    let t0 = timer()
    try {
      show_log_messages = false
      compile(["include *"], true)
    } finally {
      show_log_messages = true
    }
    let t1 = timer()
    total_time += t1 - t0
    if (Math.round((i+1) % (iterations/50)) == 0 ) {
      postMessage(["update",(i+1)/iterations*100])
    }
  }

  let avg_time = total_time / iterations
  return Math.round(lines / (avg_time/1000))
}

function all_matches(pattern, string) {
  let list = []
  let m
  do {
    m = pattern.exec(string)
    if (m) {
      list.push(m[0])
    }
  } while (m)
  return list
}

function find_operation(pattern, string) {
  let operators = all_matches(pattern,string)
  if (operators.length == 1) {
    return operators[0]
  } else if (operators.length == 3) {
    return operators[1]
  } else {
    throw new CompError("Unable to find mathematical operator")
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

function find_type_priority(expr1,expr2) {
  if (expr1.name == "var_or_const") {
    return translate(expr1)[2]
  } else if (expr2.name == "var_or_const") {
    return translate(expr2)[2]
  } else {
    return translate(expr1)[2]
  }
}

function set_token(name, operation, exprs, line) {
  let add = {name:operation,type:"expression",arguments:{expr1:exprs[0],expr2:exprs[1]}}
  let set_var = {name:"set",type:"command",arguments:{expr:add,name:name},"line":line}
  return set_var
}

function gen_free_ram_map() {
  let map = []
  for (let x = 0; x < 1023; x++) { //last word of RAM is function return address
    map.push(x)
  }
  return map
}

function assert_local_name_available(name) {
  const places = [
    state.symbol_table[state.scope],
    reserved_keywords,
    state.function_table // remove to allow var names to be the same as func names?
  ]

  for (let place of places) {
    if (place !== undefined && name in place) {
      throw new CompError(`Name '${name}' is not available`)
    }
  }
}

function assert_global_name_available(name) {
  assert_local_name_available(name)

  if (name in state.symbol_table["[global]"]) {
    throw new CompError(`Name '${name}' is not available`)
  }
}

function gen_id(type) {
  let id = state.ids[type]
  state.ids[type] += 1
  if (id === undefined) {
    throw new CompError(`Error generating ID:\nUnknown structure '${type}'`)
  }
  return id
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
  let result = []
  let [expr_prefix, expr_reg] = translate(expr, type)
  result = expr_prefix
  result.push(`write ${expr_reg} alu.1`)
  return result
}

function operation_assignment_token(var_name, op, value_token) {
  let var_token = {name:"var_or_const", type:"expression", arguments: {
    name:var_name
  }}

  let token = set_token(var_name, op, [var_token, value_token])
  return translate(token)
}

function function_call(name, args) {
  load_lib(name)
  let token = {
    name:"function",
    type:"expression",
    arguments: {
      name: name,
      exprs: args
    }
  }

  return translate(token)
}

function alloc_block(size) {
  log.debug(`Request for ${size} words(s) of RAM`)
  let addrs = []
  if (size > state.free_ram[state.scope].length) {
    throw new CompError(`Out of memory, ${size} word(s) requested (only ${state.free_ram[state.scope].length} free)`)
  }
  for (let i = 0; i < size; i++) {
    addrs.push(state.free_ram[state.scope].shift())
  }

  if (!state.scope.startsWith("sys.")) {
    let allocated_slots = 1023 - state.free_ram[state.scope].length
    if (allocated_slots > state.max_allocated_ram_slots) {
      state.max_allocated_ram_slots = allocated_slots
    }
  }
  return addrs
}

function alloc_global_block(size) {
  let old_state = state.scope
  state.scope = "[global]"
  let addrs = alloc_block(size)
  state.scope = old_state

  return addrs
}

function free_global_block(addrs) {
  let old_state = state.scope
  state.scope = "[global]"
  free_block(addrs)
  state.scope = old_state
}

function assert_valid_datatype(type) {
  if (!(type in data_type_size)) {
    throw new CompError(`Data type '${type}' unknown`)
  }
}

function free_block(addrs) {
  state.free_ram[state.scope].push(...addrs)
  state.free_ram[state.scope].sort((a,b) => (a - b))
}

function get_temp_word() {
  let addr = alloc_block(1)
  return {
    addr: addr[0],
    label: `ram.${addr[0]}`,
    free: () => free_block(addr)
  }
}

function translate_body(tokens) {
  log.debug(`nested translate: ${tokens.length} token(s)`)
  let result = []
  if (tokens.length == 0) {
    return result
  }
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type == "expression" && tokens[i].name != "function" || typeof tokens[i] === undefined) {
      throw new CompError("Unexpected expression", tokens[i].line)
    } else {
      let command
      try {
        command = translate(tokens[i])
      } catch (error) {
        if (error instanceof CompError && error.line === undefined) { // if this is CompError with no line info
          throw new CompError(error.message, tokens[i].line) // add the line number to it
        } else {
          throw error
        }
      }
      if (tokens[i].name == "function") {
        command = command[0] // if it is a function call (which is an expression) take only the prefix and bin the result register [[tokens],result] -> [tokens]
        let function_type = state.function_table[tokens[i].arguments.name].data_type
        if (function_type !== "none") {
          log.warn(`line ${tokens[i].line}:\nDiscarding function's returned value of type '${function_type}'`)
        }
      }
      for (let j = 0; j < command.length; j++ ) {
        command[j] = `  ${command[j]}`
      }
      result.push(...command)
    }
  }
  return result
}

function load_lib(name) {
  log.debug(`loading library object ${name}`)
  if (!(name in libs)) {
    throw new CompError(`Library '${name}' not found`)
  }
  if (name in state.required) {
    log.debug("↳ already loaded")
  } else {
    state.required[name] = ""
    log.debug("↳ compiling")
    let old_log_status = show_log_messages
    try {
      show_log_messages = false
      compile(libs[name], true)
    } catch (error) {
      if (error instanceof CompError) { // if this is CompError with no line info
        // let the user know the error in the standard library - and not their fault
        // throw new CompError(error.message, error.line + " [in library obj. '" + name + "']")
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

  if (/^\/\/[^/].*$/.test(input)) { // a comment begining with two "//"
    token = {name:"comment",type:"command",arguments:{"comment":input}}

  } else if (/^{(.+)}$/.test(input)) {
    token = {name:"asm",type:"command",arguments:{value:/{(.+)}/.exec(input)[1]}}

  } else if (/^\"(.+)\"$|^(\"\")$/.test(input)) {     //string
    token = {name:"str",type:"expression",arguments:{value:input,type_guess:"str"}}

  } else if (list[0] == "var") {                       // var [type] [name] <expr>
    if (list.length >= 4) {
      let expr = tokenise(list.slice(3).join(" "), line) // extract all the letters after command
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError(`Invalid name '${list[2]}'`)}
      token = {name:"var_alloc",type:"command",arguments:{type:list[1],name:list[2],expr:expr}}
    } else if (list.length > 2) {
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError(`Invalid name '${list[2]}'`)}
      token = {name:"var_alloc",type:"command",arguments:{type:list[1],name:list[2]}}
    } else {
      throw new CompError("Variable decleration syntax:\nvar [type] [name] <expr>")
    }

  } else if (list[0] == "arg") {                      // arg [type] [name] <expr>
    if (list.length >= 4) {
      let expr = tokenise(list.slice(3).join(" "), line) // extract all the letters after command
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError(`Invalid name '${list[2]}'`)}
      token = {name:"arg_alloc",type:"command",arguments:{type:list[1],name:list[2],expr:expr}}
    } else if (list.length > 2) {
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError(`Invalid name '${list[2]}'`)}
      token = {name:"arg_alloc",type:"command",arguments:{type:list[1],name:list[2]}}
    } else {
      throw new CompError("Argument decleration syntax:\narg [type] [name] <expr>")
    }

  } else if (list[0] == "const") {             // const [type] [name] [expr]
    if (list.length >= 4) {
      let expr = tokenise(list.slice(3).join(" "), line) // extract all the letters after command
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError(`Invalid name '${list[2]}'`)}
      token = {name:"const_alloc",type:"command",arguments:{type:list[1],name:list[2],expr:expr}}
    } else if (list.length > 2) {
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError(`Invalid name '${list[2]}'`)}
      token = {name:"const_alloc",type:"command",arguments:{type:list[1],name:list[2]}}
    } else {
      throw new CompError("Constant decleration syntax:\nconst [type] [name] <expr>")
    }

  } else if (list[0] == "global") {             // global [type] [name] [expr]
    if (list.length >= 4) {
      let expr = tokenise(list.slice(3).join(" "), line) // extract all the letters after command
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError(`Invalid name '${list[2]}'`)}
      token = {name:"global_alloc",type:"command",arguments:{type:list[1],name:list[2],expr:expr}}
    } else if (list.length > 2) {
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError(`Invalid name '${list[2]}'`)}
      token = {name:"global_alloc",type:"command",arguments:{type:list[1],name:list[2]}}
    } else {
      throw new CompError("Global decleration syntax:\nglobal [type] [name] <expr>")
    }

  } else if (list[0] == "if") {               // if [bool]
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

  } else if (list[0] == "while") {              // while [bool]
    if (list.length > 1) {
      let expr = tokenise(list.slice(1).join(" "), line) // extract all the letters after command
      token = {name:"while",type:"structure",body:[],arguments:{expr:expr}}
    } else {
      throw new CompError("While statement has no conditional expression")
    }

   } else if (list[0] == "for") {               // for [cmd];[bool];[cmd]
    if (list.length > 1) {
      let string_list = input.slice(3).split(";")
      let init = tokenise(string_list[0],line)
      let expr = tokenise(string_list[1],line)
      let cmd = tokenise(string_list[2],line)
      token = {name:"for",type:"structure",body:[],arguments:{init:init,expr:expr,cmd:cmd}}
    } else {
      throw new CompError("Missing cmd/bool/cmd list")
    }

  } else if (list[0] == "def") {                  //def [name] [opt. return type]       need to check if name is available
    if (list.length < 2) {
      throw new CompError("Functions require a name")
    } else if (list.length > 3) {
      throw new CompError("Invalid syntax")
    }

    let force_cast = false
    if (list[2] !== undefined) {
      if (list[2].startsWith("#")) {
        force_cast = true
        list[2] = list[2].substr(1)
      }
    }

    token = {name:"function_def",type:"structure",body:[],arguments:{name:list[1],type:list[2],force_cast:force_cast}}

  } else if (list[0] == "free") {                 // free [name]
    token = {name:"delete",type:"command",arguments:{name:list[1]}}

  } else if (/^break$/.test(input)) {                 // break
    token = {name:"break",type:"command",arguments:{}}

  } else if (/^continue$/.test(input)) {                 // break
    token = {name:"continue",type:"command",arguments:{}}

  } else if (/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=].*)$/.test(input)) {                    // [name] = [expr]
    let matches = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=].*)$/.exec(input)
    let expr = tokenise(matches[2], line)
    token = {name:"set",type:"command",arguments:{expr:expr,name:matches[1]}}

  } else if (/^\*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=].*)$/.test(input)) {                    // *[pointer] = [expr]
    let matches = /^\*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=].*)$/.exec(input)
    let expr = tokenise(matches[2], line)
    token = {name:"pointer_set",type:"command",arguments:{expr:expr,name:matches[1]}}

  } else if (list[0] == "return") {                    // return
    let expr = undefined
    let expr_string = list.slice(1).join(" ")

    if (expr_string !== "") {
      expr = tokenise(expr_string, line)
    }

    token = {name:"return",type:"command",arguments:{expr:expr}}

  } else if (list[1] == "+=") {                    // [name] += [expr]
    let expr = tokenise(list.slice(2).join(" "), line)
    token = {name:"addition_assignment",type:"command",arguments:{expr:expr,name:list[0]}}

  } else if (list[1] == "-=") {                    // [name] -= [expr]
    let expr = tokenise(list.slice(2).join(" "), line)
    token = {name:"subtraction_assignment",type:"command",arguments:{expr:expr,name:list[0]}}

  } else if (list[1] == "*=") {                    // [name] *= [expr]
    let expr = tokenise(list.slice(2).join(" "), line)
    token = {name:"multiplication_assignment",type:"command",arguments:{expr:expr,name:list[0]}}

  } else if (list[1] == "/=") {                    // [name] /= [expr]
    let expr = tokenise(list.slice(2).join(" "), line)
    token = {name:"division_assignment",type:"command",arguments:{expr:expr,name:list[0]}}

  } else if (list[1] == "%=") {                    // [name] %= [expr]
    let expr = tokenise(list.slice(2).join(" "), line)
    token = {name:"modulo_assignment",type:"command",arguments:{expr:expr,name:list[0]}}

  } else if (/.+?(?=\+\+)/.test(input)) { //  [name]++
    token = {name:"increment_1",type:"command",arguments:{name:/.+?(?=\+\+)/.exec(input)}}

  } else if (/.+?(?=\-\-)/.test(input)) { //  [name]--
    token = {name:"decrement_1",type:"command",arguments:{name:/.+?(?=\-\-)/.exec(input)}}

  } else if (/^\*(\(.*\))?([a-zA-Z_][a-zA-Z0-9_]*)$/.test(input)) {                    // pointer lookup
    let matches = /^\*(\(.*\))?([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(input)
    let type_cast = undefined
    if(matches[1] !== undefined) {
      type_cast = matches[1].slice(1, -1)
    }
    let var_or_const_name = matches[2]
    token = {name:"pointer_lookup",type:"expression",arguments:{type_cast:type_cast,var_or_const_name:var_or_const_name}}

  } else if (/^\((.*)\)$/.test(input)) {  // it is an expression that is in brackets
    throw new CompError("Not implemented")

  } else if (/(^\d+$)|(^0b[10]+$)|(^0x[0-9a-fA-F]+$)/.test(input)) { //        [unsigned integer]   is dec/hex/bin number only
    let dec_val = parse_int(input)
    let guess
    if (dec_val > 65535) {
      guess = "long"
    } else {
      guess = "int"
    }
    token = {name:"number",type:"expression",arguments:{value:input,type_guess:guess}}

  } else if (/(^[+-]?\d+$)|(^-?0b[10]+$)|(^-?0x[0-9a-fA-F]+$)/.test(input)) { //   [signed integer]
    let dec_val = parse_int(input)
    let guess
    if (Math.abs(dec_val) > 32767) {
      guess = "slong"
    } else {
      guess = "sint"
    }
    token = {name:"number",type:"expression",arguments:{value:input,type_guess:guess}}

  } else if (list[0] == "include") {
    token = {name:"include",type:"command",arguments:{name:list[1]}}

  } else if (/^([a-zA-Z_][a-zA-Z0-9_]*)\.(append|insert)\((.*)\)$/.test(input)) {   // array function ie. array_name.insert/append(args)
    let matches = /^([a-zA-Z_][a-zA-Z0-9_]*)\.(append|insert)\((.*)\)$/.exec(input)
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

  } else if (/^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]\s*=\s*(.*)$/.test(input)) {       //array set ie array_name[index] = some value
    let matches = /^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]\s*=\s*(.*)$/.exec(input)
    let array_name = matches[1]
    let index_expression = matches[2]
    let value = matches[3]

    token = {name:"array_set",type:"command",arguments:{
      name: array_name,
      index_expr: tokenise(index_expression,line),
      expr: tokenise(value,line)
      }
    }

  } else if (/^([a-zA-Z_][a-zA-Z0-9_]*)\.(len|pop|max_len)\(\)$/.test(input)) {       //array function ie array_name.pop/len()
    let matches = /^([a-zA-Z_][a-zA-Z0-9_]*)\.(len|pop|max_len)\(\)$/.exec(input)
    let array_name = matches[1]
    let operation = matches[2]

    token = {name:"array_expression",type:"expression",arguments:{
      name: array_name,
      operation: operation
      }
    }

  } else if (/^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]$/.test(input)) {       //array expression ie array_name[index]
    let matches = /^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]$/.exec(input)
    let array_name = matches[1]
    let index_expression = matches[2]

    token = {name:"array_expression",type:"expression",arguments:{
      name: array_name,
      operation: "index",
      expr: tokenise(index_expression,line)
      }
    }

  } else if (/^\S+?(?=\((.*)\)$)/.test(input)) { // function call [name](*)
    let name = /^\S+?(?=\((.*)\)$)/.exec(input)[0]
    let args_string = /^\S+?(?=\((.*)\)$)/.exec(input)[1]
    let string_list = args_string.split(",")
    let args = []
    if (args_string !== "") {
      for (let item of string_list) {
        if (item !== undefined) {
          args.push(tokenise(item,line))
        }
      }
    }
    token = {name:"function",type:"expression",arguments:{name:name,exprs:args}}

  } else if (/(>> 8)|(>>)|(<<)|(!=)|(<=)|(>=)|[\+\-\*\/\!\<\>\&\^\|\%:]|(==)|(\.\.)|(sys\.ov)|(sys\.odd)/.test(input)) {          // is an expression
    let operation = find_operation(/(>> 8)|(>>)|(<<)|(!=)|(<=)|(>=)|[\+\-\*\/\!\<\>\&\^\|\%:]|(==)|(\.\.)|(sys\.ov)|(sys\.odd)/g, input)
    if (operation in {"+":"", "-":"", "/":"", "*":"", "^":"", "%":""}) { // dual operand [non bool]
      let args = input.split(operation)
      let expr1 = tokenise(args[0], line)
      let expr2 = tokenise(args[1], line)
      token = {name:operation,type:"expression",arguments:{expr1:expr1,expr2:expr2}}

    } else if (operation in {">":"", "<":"","==":"","!=":"", "&":"", ">=":"", "<=":"", "|":"", "..":"", ":":""}) { // dual operand [bool]
      let args = input.split(operation)
      let expr1 = tokenise(args[0], line)
      let expr2 = tokenise(args[1], line)
      token = {name:operation,type:"expression",arguments:{expr1:expr1,expr2:expr2}}

    } else if (operation in {">>":"", "<<":"", "!":"", ">> 8":""}) { // single operand [non-bool]
      let args = CSVToArray(input,operation)
      let expr = tokenise(args[0][0], line)
      token = {name:operation,type:"expression",arguments:{expr:expr}}

    } else if (operation == "sys.odd") {
      let args = /([^\n\r]*)sys.odd\s*/.exec(input)
      let expr = tokenise(args[1], line)
      token = {name:"is_odd",type:"expression",arguments:{expr:expr}}

    } else if (operation == "sys.ov") {
      token = {name:"overflow",type:"expression",arguments:{}}

    } else {
      throw new CompError(`Unknown operator '${operation}'`)
    }

  } else if (/(^true$)|(^false$)/.test(input)) {    //is true/false (the reserved keywords for bool data type)
    token = {name:"bool",type:"expression",arguments:{value:input}}

  } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input) ) {                       //variable or const (by name)
    token = {name:"var_or_const",type:"expression",arguments:{name:input}}

  } else if (/^((\(.*\))?(\[.*\]))$/.test(input)) {                          //array of expressions
    let matches = /^((\(.*\))?(\[.*\]))$/.exec(input)

    let type_size = undefined
    if(matches[2] !== undefined) {
      let type_size_string = matches[2].slice(1, -1)
      type_size = type_size_string.split(",")
    }

    let elements_string = matches[3].slice(1, -1)
    let elements_array = elements_string.split(",")
    let token_array = []

    for (let item of elements_array) {
      token_array.push(tokenise(item,line))
    }

    token = {name:"expr_array",type:"expression",
      arguments:{
      exprs:token_array,
      type_size:type_size
    }}

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
      assert_local_name_available(args.name)

      let value
      if (args.expr === undefined) {
        value = tokenise(data_type_default_value[args.type])
      } else {
        value = args.expr
      }

      let [expr_prefix, expr_value, expr_type] = translate(value, args.type)

      if (args.type !== expr_type) {
        throw new CompError(`Wrong data type, expected '${args.type}', got '${expr_type}'`)
      }

      let memory = alloc_block(expr_value.length)

      // add entry to symbol table
      state.symbol_table[state.scope][args.name] = {
        type: "variable",
        data_type: expr_type,
        specific: {
          ram_addresses: memory.slice()
        }
      }

      // make data available
      result = expr_prefix

      for (let expr_word of expr_value) {
        result.push(`write ${expr_word} ram.${memory.shift()}`)
      }
    } break

    case "const_alloc": {    //const [name] [type] [expr]
      assert_valid_datatype(args.type)
      assert_global_name_available(args.name)

      let value
      if (args.expr === undefined) {
        value = tokenise(data_type_default_value[args.type])
      } else {
        value = args.expr
      }

      if (!(["str", "number"].includes(value.name))) {
        log.info(value)
        throw new CompError("Constant must be static values")
      }

      let [expr_prefix, expr_value, expr_type] = translate(value, args.type)
      if (args.type != expr_type) {
        throw new CompError(`Wrong data type, expected '${args.type}', got '${expr_type}'`)
      }

      let label = `const_${args.name}`
      let memory = []
      for (let i = 0; i < expr_value.length; i++) {
        memory.push(`${label}_${i}`)
      }

      // add entry to symbol table
      state.symbol_table["[global]"][args.name] = {
        type: "constant",
        data_type: args.type,
        specific: {
          value: memory.slice()
        }
      }

      for (let word of expr_value) {
        state.consts.push(`${memory.shift()}:`)
        state.consts.push(word)
      }
    } break

    case "global_alloc": {    //global [name] [type] <expr>
      // arrays require a different allocation method
      if (args.type == "array") {
        token.name = "global_array_alloc"
        result = translate(token)
        break
      }

      assert_valid_datatype(args.type)
      assert_local_name_available(args.name)

      let value
      if (args.expr === undefined) {
        value = tokenise(data_type_default_value[args.type])
      } else {
        value = args.expr
      }

      let [expr_prefix, expr_value, expr_type] = translate(value, args.type)

      if (args.type !== expr_type) {
        throw new CompError(`Wrong data type, expected '${args.type}', got '${expr_type}'`)
      }

      let memory = alloc_global_block(expr_value.length)

      // add entry to symbol table
      state.symbol_table["[global]"][args.name] = {
        type: "variable",
        data_type: args.type,
        specific: {
          ram_addresses: memory.slice()
        }
      }

      // make data available
      result = expr_prefix

      for (let expr_word of expr_value) {
        result.push(`write ${expr_word} ram^.${memory.shift()}`)
      }
    } break

    case "arg_alloc": {      //arg [type] [name] [expr]
      if (state.scope === "[root]") {
        throw new CompError("Argument declaration can only be used in functions")
      }

      assert_valid_datatype(args.type)
      assert_local_name_available(args.name)

      let value
      if (args.expr === undefined) {
        value = tokenise(data_type_default_value[args.type])
      } else {
        value = args.expr
      }

      let [expr_prefix, expr_value, expr_type] = translate(value, args.type)

      if (args.type !== expr_type) {
        throw new CompError(`Wrong data type, expected '${args.type}', got '${expr_type}'`)
      }

      let memory = alloc_block(expr_value.length)

      // add entry to symbol table
      state.symbol_table[state.scope][args.name] = {
        type: "argument",
        data_type: expr_type,
        specific: {
          ram_addresses: memory.slice()
        }
      }

      // add argument to function
      state.function_table[state.scope].arguments.push(args.name)

      // make data available
      result = expr_prefix

      for (let expr_word of expr_value) {
        result.push(`write ${expr_word} ram.${memory.shift()}`)
      }

      let label = `func_${state.scope}_${args.name}:`
      result.push(label)
    } break

    case "var_array_alloc": {
      assert_local_name_available(args.name)

      let [expr_prefix, expr_values, expr_type] = translate(args.expr)

      if (expr_type !== "expr_array") {
        throw new CompError(`Array declarations require type 'expr_array', got '${expr_type}'`)
      }

      let [base_addr, current_len, max_len, data_type] = expr_values

      assert_valid_datatype(data_type)
      let element_size = data_type_size[data_type]

      let header_memory = alloc_block(3)
      let array_memory = alloc_block(max_len * element_size)

      // add to symbol table
      state.symbol_table[state.scope][args.name] = {
        type: "variable",
        data_type: "array",
        specific: {
          element_data_type: data_type, // TODO
          base_addr: header_memory[0],
          current_len: header_memory[1],
          max_len: header_memory[2],
          array_mem: array_memory
        }
      }

      result.push(`write ram.${array_memory[0]} ram.${header_memory[0]}`)
      result.push(`write ${current_len} ram.${header_memory[1]}`)
      result.push(`write ${max_len} ram.${header_memory[2]}`)

      // call function to copy inital values to array
      load_lib("sys.rom_to_ram_copy")
      result.push(`write ${base_addr} ram+.0`)
      result.push(`write ram.${array_memory[0]} ram+.1`)
      result.push(`write ${current_len * element_size} ram+.2`)
      result.push("call func_sys.rom_to_ram_copy_length")
    } break

    case "global_array_alloc": {
      assert_global_name_available(args.name)

      let [expr_prefix, expr_values, expr_type] = translate(args.expr)

      if (expr_type !== "expr_array") {
        throw new CompError(`Array declarations require type 'expr_array', got '${expr_type}'`)
      }

      let [base_addr, current_len, max_len, data_type] = expr_values

      assert_valid_datatype(data_type)
      let element_size = data_type_size[data_type]

      let header_memory = alloc_global_block(3)
      let array_memory = alloc_global_block(max_len * element_size)

      // add to symbol table
      state.symbol_table["[global]"][args.name] = {
        type: "variable",
        data_type: "array",
        specific: {
          element_data_type: data_type,
          base_addr: header_memory[0],
          current_len: header_memory[1],
          max_len: header_memory[2],
          array_mem: array_memory
        }
      }

      result.push(`write ram^.${array_memory[0]} ram^.${header_memory[0]}`)
      result.push(`write ${current_len} ram^.${header_memory[1]}`)
      result.push(`write ${max_len} ram^.${header_memory[2]}`)

      // call function to copy inital values to array
      load_lib("sys.rom_to_global_ram_copy")
      result.push(`write ${base_addr} ram+.0`)
      result.push(`write ram.${array_memory[0]} ram+.1`)
      result.push(`write ${current_len * element_size} ram+.2`)
      result.push("call func_sys.rom_to_global_ram_copy_length")
    } break

    case "set": {            //[name] = [expr]
      if (args.name in state.symbol_table[state.scope]) {
        // this is a local variable or argument

        let table_entry = state.symbol_table[state.scope][args.name]

        if (!["variable","argument"].includes(table_entry.type)) {
          throw new CompError("Only variables and arguments can be modified")
        }

        let dst_regs = table_entry.specific.ram_addresses
        let dst_type = table_entry.data_type

        // get the value and type of the expression
        let [prefix, value, expr_type] = translate(args.expr, dst_type)

        if (expr_type !== dst_type) {
          throw new CompError(`Variable expected type '${dst_type}', got '${expr_type}'`)
        }

        // run the code state.required by the expression
        result = prefix

        // copy the new value into the variable's memory
        for (let i = 0; i < dst_regs.length; i++) {
          result.push(`write ${value[i]} ram.${dst_regs[i]}`)
        }

      } else if (args.name in state.symbol_table["[global]"]) {
        // this is a global variable

        let table_entry = state.symbol_table["[global]"][args.name]

        if (table_entry.type !== "variable") {
          throw new CompError("Only variables can be modified")
        }

        let dst_regs = table_entry.specific.ram_addresses
        let dst_type = table_entry.data_type

        // get the value and type of the expression
        let [prefix, value, expr_type] = translate(args.expr, dst_type)

        if (expr_type !== dst_type) {
          throw new CompError(`Variable expected type '${dst_type}', got '${expr_type}'`)
        }

        // run the code state.required by the expression
        result = prefix

        // copy the new value into the variable's memory
        for (let i = 0; i < dst_regs.length; i++) {
          result.push(`write ${value[i]} ram^.${dst_regs[i]}`)
        }

      } else {
        throw new CompError(`Variable '${args.name}' is undefined`)
      }
    } break

    case "pointer_set": {            //*[pointer] = [expr]
      let [expr_prefix, expr_value, expr_type] = translate(args.expr)
      let size = data_type_size[expr_type]

      // run code state.required by expression
      result = expr_prefix

      let ptr_expr = tokenise(args.name)
      let [ptr_prefix, ptr_value, ptr_type] = translate(ptr_expr)

      if (ptr_type !== "int") {
        throw new CompError(`Pointers must be of type 'int', got ${ptr_type}`)
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
      let array_name = args.name
      let index_expr = args.index_expr
      let expr = args.expr

      let [index_prefix, index_value, index_type] = translate(index_expr, "int")
      if (index_type !== "int") {
        throw new CompError("Array indexes must be of type 'int'")
      }
      result.push(...index_prefix)

      let scope_name
      let ram_prefix
      if (array_name in state.symbol_table[state.scope]) {
        // this is a local array
        scope_name = state.scope
        ram_prefix = "ram."
      } else if (array_name in state.symbol_table["[global]"]) {
        // this is a global array
        scope_name = "[global]"
        ram_prefix = "ram^."
      } else {
        throw new CompError(`Cannot find array named '${array_name}'`)
      }

      let table_entry = state.symbol_table[scope_name][array_name].specific
      let array_type = table_entry.element_data_type

      let base_addr = `[${ram_prefix}${table_entry.base_addr}]`
      let item_size = data_type_size[array_type]

      // calculate address of the specified index
      load_lib("sys.array_pointer")
      result.push(`write ${index_value} ram+.0`)
      result.push(`write ${item_size} ram+.1`)
      result.push(`write ${base_addr} ram+.2`)
      result.push("call func_sys.array_pointer_base_addr") //output is in ram+.3

      let temp_var = get_temp_word()
      result.push(`write [ram+.3] ${temp_var.label}`)
      let target_addr = `[${temp_var.label}]`

      //evaluate the expression and put the result in a buffer area
      let [expr_prefix, expr_values, expr_type] = translate(expr, array_type)
      if (expr_type !== array_type) {
        throw new CompError(`Array expected type '${array_type}', got '${expr_type}'`)
      }
      result.push(...expr_prefix)

      let memory = alloc_block(item_size)
      let buffer = memory.slice()

      for (let word of expr_values) {
        result.push(`write ${word} ram.${buffer.shift()}`)
      }

      let source_addr = `ram.${memory[0]}`

      //copy value of expr into correct position in array
      result.push(`write ${source_addr} ram+.0`)
      result.push(`write ${target_addr} ram+.1`)
      result.push(`write ${item_size} ram+.2`)

      // if this is a global array we need a different copy function
      if (scope_name === "[global]") {
        load_lib("sys.ram_to_global_ram_copy")
        result.push("call func_sys.ram_to_global_ram_copy_length")
      } else {
        load_lib("sys.ram_to_ram_copy")
        result.push("call func_sys.ram_to_ram_copy_length")
      }

      temp_var.free()
      free_block(memory)
    } break

    case "array_function": {
      let array_name = args.name
      let operation = args.operation

      let scope_name
      let ram_prefix
      if (array_name in state.symbol_table[state.scope]) {
        // this is a local array
        scope_name = state.scope
        ram_prefix = "ram."
      } else if (array_name in state.symbol_table["[global]"]) {
        // this is a global array
        scope_name = "[global]"
        ram_prefix = "ram^."
      } else {
        throw new CompError(`Cannot find array named '${array_name}'`)
      }

      let table_entry = state.symbol_table[scope_name][array_name].specific
      let array_type = table_entry.element_data_type

      let base_addr = `[${ram_prefix}${table_entry.base_addr}]`
      let current_len = `[${ram_prefix}${table_entry.current_len}]`
      let max_len = `[${ram_prefix}${table_entry.max_len}]`
      let item_size = data_type_size[array_type]

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
        result.push(`write ${current_len} alu.1`)
        result.push("write 1 alu.2")
        result.push(`write [alu.+] ${current_len.slice(1, -1)}`)

      } else if (operation === "insert") {
        let [index_expression, item_expression] = args.exprs

        //evaluate the expression that gives the index
        let [expr_prefix, expr_value, expr_type] = translate(index_expression, "int")
        if (expr_type !== "int") {
          throw new CompError("Array indexes must be of type 'int'")
        }
        result.push(...expr_prefix)

        let source_addr = get_temp_word()
        let target_addr = get_temp_word()

        //calculate address of the specified index and index+1
        load_lib("sys.array_pointer")
        result.push(`write ${expr_value} ram+.0`)
        result.push(`write ${item_size} ram+.1`)
        result.push(`write ${base_addr} ram+.2`)
        result.push("call func_sys.array_pointer_base_addr") //output is in ram+.3

        result.push(`write [ram+.3] ${source_addr.label}`)
        result.push("write [ram+.3] alu.1")
        result.push(`write ${item_size} alu.2`)
        result.push(`write [alu.+] ${target_addr.label}`)

        //calculate the length of the array in memory
        load_lib("sys.int_multiply")
        result.push(`write ${item_size} ram+.0`)
        result.push(`write ${current_len} ram+.1`)
        result.push("call func_sys.int_multiply_b")

        //shift entire array (that is below the specified poisiton) one item_size down
        result.push(`write [${source_addr.label}] ram+.0`)
        result.push(`write [${target_addr.label}] ram+.1`)
        result.push("write [ram+.2] ram+.2")

        // if this is a global array we need a different copy function
        if (scope_name === "[global]") {
          load_lib("sys.global_ram_to_global_ram_copy")
          result.push("call func_sys.global_ram_to_global_ram_copy_length")
        } else {
          load_lib("sys.ram_to_ram_copy")
          result.push("call func_sys.ram_to_ram_copy_length")
        }

        //put item at the specified index
        let set_token = {name:"array_set",type:"command",arguments:{
          name: array_name,
          index_expr: index_expression,
          expr: item_expression
        }}
        result.push(...translate(set_token))

        //add one to length
        result.push(`write ${current_len} alu.1`)
        result.push("write 1 alu.2")
        result.push(`write [alu.+] ${current_len.slice(1, -1)}`)

        source_addr.free()
        target_addr.free()

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
      } else if (args.name in state.symbol_table["[global]"]) {
        // it's a global symbol
        table_entry = state.symbol_table["[global]"][args.name]
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
        free_global_block(addrs)
      } else {
        free_block(addrs)
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
      if (state.scope === "[root]") {
        throw new CompError("Statement 'return' can only be used in functions")
      }

      let func_type = state.function_table[state.scope].data_type
      let force_cast = state.function_table[state.scope].force_cast
      if (func_type === "none" && args.expr !== undefined) {
        throw new CompError("Functions of type 'none' cannot return values")
      }

      // if the return statement should have an expression, evaluate it
      if (func_type !== "none") {

        let [prefix, value, expr_type] = translate(args.expr, func_type)

        if (force_cast) {
          // cast any return expression to this type, ignoring any mis-match
          log.warn(`line ${token.line}:\nCasting return expression of type '${expr_type}' to '${func_type}'`)

        } else if (expr_type !== func_type) {
          // the type of the expression in the return statement does not match the data type of the function
          throw new CompError(`Function returns type '${func_type}', but return expression is of type '${expr_type}'`)
        }

        // include the code to evaluate the expression
        result = prefix

        let map = []
        for (let item of value) {
          let temp = item.replace("ram","ram+")
          //this next replace prevents recursive function calls producing ram++++.x addresses
          map.push(temp.replace("ram++","ram+"))
        }
        state.function_table[state.scope].return_value = map
      }

      // add the actual return instruction
      result.push("return")
    } break

    case "include": {
      if (args.name == "*") {
        for (let name in libs) {
          load_lib(name)
        }
      } else {
        load_lib(args.name)
      }
    } break

    case "break": {
      if (state.inner_structure_label === undefined) {
        throw new CompError("'break' can only be used in for/while loops")
      }
      result.push(`goto ${state.inner_structure_label}_end`)
    } break

    case "continue": {
      if (state.inner_structure_label === undefined) {
        throw new CompError("'continue' can only be used in for/while loops")
      }
      result.push(`goto ${state.inner_structure_label}_cond`)
    } break

    default:
      throw new CompError(`Error translating command:\nUnknown type '${token.name}'`)
    }
    return result

  } else if (token.type == "expression") {

    let prefix = []
    let registers = [""]
    let type = ctx_type
    let types = []
    switch (token.name) {

    // number types
    case "number":  { // a generic number that can be turned into the type state.required by the context
      if (ctx_type === undefined) {
        log.warn(`line ${token.line}:\nNo context-specified type for '${args.value}'\nassuming '${args.type_guess}'`)
        type = args.type_guess
      } else {
        type = ctx_type
      }

      let num_token = {name:type, type:"expression", arguments:{ value:args.value }}
      let prefix_register_type = translate(num_token, type)
      prefix = prefix_register_type[0]
      registers = prefix_register_type[1]
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

    case "int": {
      if (!/(^[+]?\d+$)|(^0b[10]+$)|(^0x[0-9a-fA-F]+$)/.test(args.value)) {
        throw new CompError("Invalid input for type 'int'")
      }

      let dec_val = parse_int(args.value)

      if (dec_val > 65535) {
        throw new CompError("Integer too large (2^16 / 65535 max)")
      }

      type = "int"
      registers = [args.value]
    } break

    case "sint": {
      if (!/(^[+-]?\d+$)|(^-?0b[10]+$)|(^-?0x[0-9a-fA-F]+$)/.test(args.value)) {
        throw new CompError("Invalid input for type 'sint'")
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

      if (dec_val == 0) {
        negative = false
      }

      let bin = 0

      if (negative) {
        bin = (0xffff - dec_val + 1).toString(2)
      } else {
        bin = dec_val.toString(2)
      }
      let word = `0b${pad(bin,16)}`

      type = "sint"
      registers = [word]
    } break

    case "long": {
      if (!/(^[+]?\d+$)|(^0b[10]+$)|(^0x[0-9a-fA-F]+$)/.test(args.value)) {
        throw new CompError("Invalid input for type 'long'")
      }

      let dec_val = parse_int(args.value)

      if (dec_val > 4294967295) {
        throw new CompError("Integer out of range (2^32 / 4.29bn max)")
      }
      let bin = pad(dec_val.toString(2),32)
      let high = `0b${bin.substring(0,16)}`
      let low = `0b${bin.substring(16,32)}`

      type = "long"
      registers = [high,low]
    } break

    case "slong": {
      if (!/(^[+-]?\d+$)|(^-?0b[10]+$)|(^-?0x[0-9a-fA-F]+$)/.test(args.value)) {
        throw new CompError("Invalid input for type 'sint'")
      }

      let negative = false
      if (args.value.startsWith("-")) {
        args.value = args.value.substring(1)
        negative = true
      }

      let dec_val = parse_int(args.value)

      if (dec_val == 0) {
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
      type = "slong"
    } break

    case "float": {
      throw new CompError("Type 'float' not implemented")
      type = "float"
    } break

    case "str": {
      if (args.value[0] != "\"" || args.value[args.value.length-1] != "\"") {
        throw new CompError("Strings must be quoted")
      }
      let string = args.value.slice(1,-1)

      let id = `str_${gen_id("str")}`

      state.consts.push(`${id}:`)

      for (let i = 0; i < string.length; i++) {
        let char = string[i]
        let code = char.charCodeAt(0)
        if (code < 32 || code > 127) {
          throw new CompError(`'${char}' is not a valid character`)
        }
        state.consts.push(code)
      }

      // string terminator
      state.consts.push(0)

      registers = [id]
      type = "str"
    } break

    case "bracket": {
      throw new CompError("Not implemented")
    } break

                                        //arithmetic operations
    case "+": {  //add
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      types = [translate(args.expr1,ctx_type)[2],translate(args.expr2,ctx_type)[2]]
      if (types[0] !== types[1]) {
        throw new CompError(`Addition operator expected '${ctx_type}', got '${types[0]}' & '${types[1]}'`)
      }
      switch (ctx_type) {
        case "int":
        case "sint": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          registers = ["[alu.+]"]
        } break

        case "long": {
          [prefix, registers] = function_call("sys.long_add", [args.expr1,args.expr2])
        } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_add", [args.expr1,args.expr2])
        } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "-": {  //subtract
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      types = [translate(args.expr1,ctx_type)[2],translate(args.expr2,ctx_type)[2]]
      if (types[0] !== types[1]) {
        throw new CompError(`Subtraction operator expected '${ctx_type}', got '${types[0]}' & '${types[1]}'`)
      }
      switch (ctx_type) {
        case "sint":
        case "int": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          registers = ["[alu.-]"]
        } break

        case "long": {
          [prefix, registers] = function_call("sys.long_subtract", [args.expr1,args.expr2])
        } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_subtract", [args.expr1,args.expr2])
        } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "*": {  //multiply
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      types = [translate(args.expr1,ctx_type)[2],translate(args.expr2,ctx_type)[2]]
      if (types[0] !== types[1]) {
        throw new CompError(`Multiplication operator expected '${ctx_type}', got '${types[0]}' & '${types[1]}'`)
      }
      switch (ctx_type) {
        case "int": {
          [prefix, registers] = function_call("sys.int_multiply", [args.expr1,args.expr2])
        } break

        case "sint": {
          [prefix, registers] = function_call("sys.sint_multiply", [args.expr1,args.expr2])
        } break

        case "long": {
          [prefix, registers] = function_call("sys.long_multiply", [args.expr1,args.expr2])
        } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_multiply", [args.expr1,args.expr2])
        } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "/": {  //divide
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      types = [translate(args.expr1,ctx_type)[2],translate(args.expr2,ctx_type)[2]]
      if (types[0] !== types[1]) {
        throw new CompError(`Division operator expected '${ctx_type}', got '${types[0]}' & '${types[1]}'`)
      }
      switch (ctx_type) {
        case "int": {
          [prefix, registers] = function_call("sys.int_divide", [args.expr1,args.expr2])
        } break

        case "sint": {
          [prefix, registers] = function_call("sys.sint_divide", [args.expr1,args.expr2])
        } break

        case "long": {
          [prefix, registers] = function_call("sys.long_divide", [args.expr1,args.expr2])
        } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_divide", [args.expr1,args.expr2])
        } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "^": {  //exponent
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      types = [translate(args.expr1,ctx_type)[2],translate(args.expr2,ctx_type)[2]]
      if (types[0] !== types[1]) {
        throw new CompError(`Exponention operator expected '${ctx_type}', got '${types[0]}' & '${types[1]}'`)
      }
      switch (ctx_type) {
        case "int": {
          [prefix, registers] = function_call("sys.int_exponent", [args.expr1,args.expr2])
        } break

        case "sint": {
          [prefix, registers] = function_call("sys.sint_exponent", [args.expr1,args.expr2])
        } break

        case "long": {
          [prefix, registers] = function_call("sys.long_exponent", [args.expr1,args.expr2])
        } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_exponent", [args.expr1,args.expr2])
        } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "%": {  //modulo
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      types = [translate(args.expr1,ctx_type)[2],translate(args.expr2,ctx_type)[2]]
      if (types[0] !== types[1]) {
        throw new CompError(`Modulo operator expected '${ctx_type}', got '${types[0]}' & '${types[1]}'`)
      }
      switch (ctx_type) {
        case "int": {
          [prefix, registers] = function_call("sys.int_modulo", [args.expr1,args.expr2])
        } break

        case "sint": {
          [prefix, registers] = function_call("sys.sint_modulo", [args.expr1,args.expr2])
        } break

        case "long": {
          [prefix, registers] = function_call("sys.long_modulo", [args.expr1,args.expr2])
        } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_modulo", [args.expr1,args.expr2])
        } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break
                                          //comparison expressions
    case ">": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      ctx_type = find_type_priority(args.expr1,args.expr2)
      switch (ctx_type) {
        case "int": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          registers = ["[alu.>]"]
        } break

        case "sint": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          let temp_var = get_temp_word()
          prefix.push(`write [alu.-] ${temp_var.label}`)
          prefix.push(`write [${temp_var.label}] alu.1`)
          prefix.push("write 1 alu.2")
          prefix.push(`write [alu.-] ${temp_var.label}`)
          prefix.push(`write [${temp_var.label}] alu.1`)
          prefix.push("write 0b1000000000000000 alu.2")
          registers = ["[alu.<]"]
          temp_var.free()
        } break

        case "long": {
          [prefix, registers] = function_call("sys.long_greater", [args.expr1,args.expr2])
        } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_greater", [args.expr1,args.expr2])
        } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break

    case "<": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      ctx_type = find_type_priority(args.expr1,args.expr2)
      switch (ctx_type) {
        case "int": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          registers = ["[alu.<]"]
          } break

        case "sint": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          let temp_var = get_temp_word()
          prefix.push(`write [alu.-] ${temp_var.label}`)
          prefix.push(`write [${temp_var.label}] alu.1`)
          prefix.push("write 1 alu.2")
          prefix.push(`write [alu.+] ${temp_var.label}`)
          prefix.push(`write [${temp_var.label}] alu.1`)
          prefix.push("write 0b0111111111111111 alu.2")
          registers = ["[alu.>]"]
          temp_var.free()
          } break

        case "long": {
          [prefix, registers] = function_call("sys.long_less", [args.expr1,args.expr2])
          } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_less", [args.expr1,args.expr2])
          } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break

    case ">=": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      ctx_type = find_type_priority(args.expr1,args.expr2)
      switch (ctx_type) {
        case "int": {
          let temp_vars = [get_temp_word(), get_temp_word()]

          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          prefix.push(`write [alu.=] ${temp_vars[0].label}`)
          prefix.push(`write [alu.>] ${temp_vars[1].label}`)
          prefix.push(`write [${temp_vars[0].label}] alu.1`)
          prefix.push(`write [${temp_vars[1].label}] alu.2`)
          registers = ["[alu.|]"]

          temp_vars[0].free()
          temp_vars[1].free()
          } break

        case "sint": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          let temp_var = get_temp_word()
          prefix.push(`write [alu.-] ${temp_var.label}`)
          prefix.push(`write [${temp_var.label}] alu.1`)
          prefix.push("write 0b1000000000000000 alu.2")
          registers = ["[alu.<]"]
          temp_var.free()
          } break

        case "long": {
          let temp_vars = [get_temp_word(), get_temp_word()]

          let prefix_and_value = function_call("sys.long_greater", [args.expr1,args.expr2])
          prefix = prefix_and_value[0]

          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[0].label}`)

          prefix_and_value = function_call("sys.long_equal", [args.expr1,args.expr2])
          prefix.push(...prefix_and_value[0])
          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[1].label}`)

          prefix.push(`write [${temp_vars[0].label}] alu.1`)
          prefix.push(`write [${temp_vars[1].label}] alu.2`)
          registers = ["[alu.|]"]

          temp_vars[0].free()
          temp_vars[1].free()
          } break

        case "slong": {
          let temp_vars = [get_temp_word(), get_temp_word()]

          let prefix_and_value = function_call("sys.slong_greater", [args.expr1,args.expr2])
          prefix = prefix_and_value[0]

          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[0].label}`)

          prefix_and_value = function_call("sys.slong_equal", [args.expr1,args.expr2])
          prefix.push(...prefix_and_value[0])
          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[1].label}`)

          prefix.push(`write [${temp_vars[0].label}] alu.1`)
          prefix.push(`write [${temp_vars[1].label}] alu.2`)
          registers = ["[alu.|]"]

          temp_vars[0].free()
          temp_vars[1].free()
          } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break

    case "<=": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      ctx_type = find_type_priority(args.expr1,args.expr2)
      switch (ctx_type) {
        case "int": {
          let temp_vars = [get_temp_word(), get_temp_word()]

          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          prefix.push(`write [alu.=] ${temp_vars[0].label}`)
          prefix.push(`write [alu.<] ${temp_vars[1].label}`)
          prefix.push(`write [${temp_vars[0].label}] alu.1`)
          prefix.push(`write [${temp_vars[1].label}] alu.2`)
          registers = ["[alu.|]"]

          temp_vars[0].free()
          temp_vars[1].free()
          } break

        case "sint": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          let temp_var = get_temp_word()
          prefix.push(`write [alu.-] ${temp_var.label}`)
          prefix.push(`write [${temp_var.label}] alu.1`)
          prefix.push("write 0b0111111111111111 alu.2")
          registers = ["[alu.>]"]
          temp_var.free()
          } break

        case "long": {
          let temp_vars = [get_temp_word(), get_temp_word()]

          let prefix_and_value = function_call("sys.long_less", [args.expr1,args.expr2])
          prefix = prefix_and_value[0]

          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[0].label}`)

          prefix_and_value = function_call("sys.long_equal", [args.expr1,args.expr2])
          prefix.push(...prefix_and_value[0])
          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[1].label}`)

          prefix.push(`write [${temp_vars[0].label}] alu.1`)
          prefix.push(`write [${temp_vars[1].label}] alu.2`)
          registers = ["[alu.|]"]

          temp_vars[0].free()
          temp_vars[1].free()
          } break

        case "slong": {
          let temp_vars = [get_temp_word(), get_temp_word()]

          let prefix_and_value = function_call("sys.slong_less", [args.expr1,args.expr2])
          prefix = prefix_and_value[0]

          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[0].label}`)

          prefix_and_value = function_call("sys.slong_equal", [args.expr1,args.expr2])
          prefix.push(...prefix_and_value[0])
          prefix.push(`write ${prefix_and_value[1][0]} ${temp_vars[1].label}`)

          prefix.push(`write [${temp_vars[0].label}] alu.1`)
          prefix.push(`write [${temp_vars[1].label}] alu.2`)
          registers = ["[alu.|]"]

          temp_vars[0].free()
          temp_vars[1].free()
          } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break

    case "==": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      ctx_type = find_type_priority(args.expr1,args.expr2)
      switch (ctx_type) {
        case "bool":
        case "int":
        case "sint": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          registers = ["[alu.=]"]
        } break

        case "long": {
          [prefix, registers] = function_call("sys.long_equal", [args.expr1,args.expr2])
          } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_equal", [args.expr1,args.expr2])
          } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break

    case "!=": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      ctx_type = find_type_priority(args.expr1,args.expr2)
      switch (ctx_type) {
        case "bool":
        case "int":
        case "sint": {
          prefix = write_operands(args.expr1,args.expr2,ctx_type)
          prefix.push("write [alu.=] ctl.cnd")
          prefix.push("write [ctl.cnd] alu.1")
          registers = ["[alu.!]"]
        } break

        case "long": {
          [prefix, registers] = function_call("sys.long_not_equal", [args.expr1,args.expr2])
        } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_not_equal", [args.expr1,args.expr2])
        } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
      type = "bool"
    } break
                                    //bit-wise operations, only needs to test word length
    case "&": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      types = [translate(args.expr1)[2],translate(args.expr2)[2]]

      prefix = write_operands(args.expr1,args.expr2,ctx_type)
      registers = ["[alu.&]"]
    } break

    case "|": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      types = [translate(args.expr1)[2],translate(args.expr2)[2]]

      prefix = write_operands(args.expr1,args.expr2,ctx_type)
      registers = ["[alu.|]"]
    } break

    case ">>": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      switch (ctx_type) {
        case "int": {
          prefix = write_operand(args.expr,ctx_type)
          registers = ["[alu.>>]"]
        } break

        case "sint": {
          [prefix, registers] = function_call("sys.sint_rshift", [args.expr])
        } break

        case "long": {
          [prefix, registers] = function_call("sys.long_rshift", [args.expr])
        } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_rshift", [args.expr])
        } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "<<": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      switch (ctx_type) {
        case "int":
        case "sint": {
          prefix = write_operand(args.expr,ctx_type)
          registers = ["[alu.<<]"]
        } break

        case "long": {
          [prefix, registers] = function_call("sys.long_lshift", [args.expr])
        } break

        case "slong": {
          [prefix, registers] = function_call("sys.slong_lshift", [args.expr])
        } break

        default:
          throw new CompError(`Unsupported datatype '${ctx_type}' for operation '${token.name}'`)
      }
    } break

    case "!": {   //(not)
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      prefix = write_operand(args.expr,ctx_type)
      registers = ["[alu.!]"]
    } break

    case "..": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      let expr1 = translate(args.expr1,ctx_type)
      let expr1_prefix = expr1[0]
      let expr1_reg = expr1[1]
      prefix = expr1_prefix
      let expr2 = translate(args.expr2,ctx_type)
      let expr2_prefix = expr2[0]
      let expr2_reg = expr2[1]
      prefix.push(...expr2_prefix)
      registers = expr1_reg
      registers.push(...expr2_reg)
    } break

    case ":": { //word selector
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      let expr = translate(args.expr1,ctx_type)
      prefix = expr[0]
      let expr_regs = expr[1]

      let index = translate(args.expr2,"int")
      if (index[2] != "int") {
        throw new CompError("Word selector index must be of type 'int'") //should also be static (ie. number token)
      }
      if (index[1][0] >= expr_regs.length) {
        throw new CompError("Index out of range")
      }

      registers = [expr_regs[index[1][0]]]
    } break
                                  //others
    case "is_odd": {
      log.debug(`op: ${token.name}, target type: ${ctx_type}`)
      let prefix_and_value = translate(args.expr,"int")
      prefix = prefix_and_value[0]
      registers = prefix_and_value[1]
      //~ if (prefix_and_value[2] != "int") {
        //~ throw new CompError("not supported unless int")
      //~ }
      registers = [registers[registers.length - 1]]
    } break

    case "overflow": {
      registers = ["[alu.ov]"]
    } break

    case "expr_array": {
      let label = `expr_array_${gen_id("expr_array")}`

      let given_type_size = args.type_size
      let length = args.exprs.length

      // if no context given use 1st element to determine type
      // and assume current length is max length
      let contained_type
      if (ctx_type === undefined) {
        contained_type = args.exprs[0].arguments.type_guess
      } else {
        contained_type = ctx_type
      }
      let max_length = length

      // but explicitly given type and max length will override these
      if (given_type_size !== undefined) {
        if (given_type_size.length == 1) {
          contained_type = given_type_size[0]
        } else if (given_type_size.length == 2) {
          contained_type = given_type_size[0]
          max_length = parseInt(given_type_size[1])
        }
      }

      if (ctx_type === undefined && given_type_size === undefined) {
        log.warn(`line ${token.line}:\nInferring type as '${contained_type}' from first element of array`)
      }

      let item_size = data_type_size[contained_type]
      let consts_to_add = [`${label}:`]

      let prefix_and_value
      for (let item of args.exprs) {
        prefix_and_value = translate(item,contained_type)
        if (prefix_and_value[0].length != 0 ) {
          throw new CompError("Expressions in an array decleration must be static")
        }
        consts_to_add.push(...prefix_and_value[1])
      }
      state.consts.push(...consts_to_add)

      registers = [label, length, max_length, contained_type]
      type = "expr_array"
    } break

    case "var_or_const": {
      let table_entry
      let is_global = false

      if (args.name in state.symbol_table[state.scope])  {
        // it's a local symbol
        table_entry = state.symbol_table[state.scope][args.name]
      } else if (args.name in state.symbol_table["[global]"]) {
        // it's a global symbol
        table_entry = state.symbol_table["[global]"][args.name]
        is_global = true
      } else {
        // it does not exist
        throw new CompError(`Variable '${args.name}' is undefined`)
      }

      type = table_entry.data_type
      if (!(type in data_type_size)) {
        throw new CompError(`Variable '${args.name}' has an invalid data type '${type}'`)
      }

      registers = []
      if (["variable","argument"].includes(table_entry.type)) {
        // it's a regular variable/argument
        for (let addr of table_entry.specific.ram_addresses) {
          if (is_global) {
            registers.push(`[ram^.${addr}]`)
          } else {
            registers.push(`[ram.${addr}]`)
          }
        }
      } else if (table_entry.type === "constant") {
        // it's a constant
        for (let addr of table_entry.specific.value) {
          registers.push(`[${addr}]`)
        }
      } else {
        throw new CompError(`Unknown symbol type '${table_entry.type}'`)
      }

    } break

    case "array_expression": {
      let array_name = args.name
      let operation = args.operation

      let scope_name
      let ram_prefix
      if (array_name in state.symbol_table[state.scope]) {
        // this is a local array
        scope_name = state.scope
        ram_prefix = "ram."
      } else if (array_name in state.symbol_table["[global]"]) {
        // this is a global array
        scope_name = "[global]"
        ram_prefix = "ram^."
      } else {
        throw new CompError(`Cannot find array named '${array_name}'`)
      }

      let table_entry = state.symbol_table[scope_name][array_name].specific
      let array_type = table_entry.element_data_type

      let base_addr = `[${ram_prefix}${table_entry.base_addr}]`
      let current_len = `[${ram_prefix}${table_entry.current_len}]`
      let max_len = `[${ram_prefix}${table_entry.max_len}]`
      let item_size = data_type_size[array_type]


      if (operation == "index") {
        let prefix_value_type = translate(args.expr, "int")
        if (prefix_value_type[2] != "int") {
          throw new CompError("Array indexes must be of type 'int'")
        }
        prefix.push(...prefix_value_type[0])

        let index = prefix_value_type[1]

        //calculate address of item at the specified index
        load_lib("sys.array_pointer")
        prefix.push(`write ${index} ram+.0`)
        prefix.push(`write ${item_size} ram+.1`)
        prefix.push(`write ${base_addr} ram+.2`)
        prefix.push("call func_sys.array_pointer_base_addr") //output is in ram+.3

        let memory = alloc_block(item_size)

        //copy item from calculated address to allocated result registers
        prefix.push("write [ram+.3] ram+.0")
        prefix.push(`write ram.${memory[0]} ram+.1`)
        prefix.push(`write ${item_size} ram+.2`)

        // if this is a global array we need a different copy function
        if (scope_name === "[global]") {
          load_lib("sys.global_ram_to_ram_copy")
          prefix.push("call func_sys.global_ram_to_ram_copy_length")
        } else {
          load_lib("sys.ram_to_ram_copy")
          prefix.push("call func_sys.ram_to_ram_copy_length")
        }

        registers = []
        for (let addr of memory) {
          registers.push(`[ram.${addr}]`)
        }

      } else if (operation == "len") {
        registers = [current_len]
        type = "int"

       } else if (operation == "max_len") {
        registers = [max_len]
        type = "int"

      } else if (operation == "pop") {
        // simply take one away from the length of the array, then return the item at that index

        prefix.push(`write ${current_len} alu.1`)
        prefix.push("write 1 alu.2")
        prefix.push(`write [alu.-] ${current_len.slice(1, -1)}`)

        //calculate address of item at the specified index
        load_lib("sys.array_pointer")
        prefix.push(`write ${current_len} ram+.0`)
        prefix.push(`write ${item_size} ram+.1`)
        prefix.push(`write ${base_addr} ram+.2`)
        prefix.push("call func_sys.array_pointer_base_addr") //output is in ram+.3

        let memory = alloc_block(item_size)

        //copy item from calculated address to allocated result registers
        load_lib("sys.ram_to_ram_copy")
        prefix.push("write [ram+.3] ram+.0")
        prefix.push(`write ram.${memory[0]} ram+.1`)
        prefix.push(`write ${item_size} ram+.2`)
        prefix.push("call func_sys.ram_to_ram_copy_length")

        registers = []
        for (let addr of memory) {
          registers.push(`[ram.${addr}]`)
        }

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

      let function_table_entry = state.function_table[args.name]

      let target_args = function_table_entry.arguments
      let target_arg_no = target_args.length
      let actual_arg_no = Object.keys(args.exprs).length

      if (actual_arg_no > target_arg_no) {
        throw new CompError(`'${args.name}' takes at most ${target_arg_no} arg(s), but ${actual_arg_no} have been given`)
      }
      log.debug(`calling '${args.name}' with ${actual_arg_no}/${target_arg_no} arguments`)

      for (let i = 0; i < actual_arg_no; i++) {
        let target_type = state.symbol_table[args.name][target_args[i]].data_type
        let target_regs = state.symbol_table[args.name][target_args[i]].specific.ram_addresses

        let expr_token = args.exprs[i]

        let [expr_prefix, expr_value, expr_type] = translate(expr_token, target_type)
        if (expr_type !== target_type) {
          throw new CompError(`In call to ${args.name}()\nArg '${target_args[i]}' is of type '${target_type}', but got '${expr_type}'`)
        }

        // run code state.required by expression
        prefix.push(...expr_prefix)

        // copy each word into argument memory
        for (let y = 0; y < target_regs.length; y++) {
          let expr_word = expr_value[y]
          let arg_word = `ram+.${target_regs[y]}`
          prefix.push(`write ${expr_word} ${arg_word}`)
        }
      }

      // skip the initialisation of arguments that we have supplied values for
      // we do this by entering the function at a different point
      if (actual_arg_no > 0) {
        entry_point += `_${target_args[actual_arg_no - 1]}`
      }

      // actually call the function
      prefix.push(`call ${entry_point}`)

      registers = state.function_table[args.name].return_value
      type = state.function_table[args.name].data_type
    } break

    case "pointer_lookup": {
      let address_expr = tokenise(args.var_or_const_name)
      let [addr_prefix, addr_value, addr_type] = translate(address_expr, "int")
      if (addr_type !== "int") {
        throw new CompError(`Pointers must be of type 'int', got '${addr_type}'`)
      }

      if (args.type_cast !== undefined) {
        type = args.type_cast
      } else if (ctx_type !== undefined) {
        type = ctx_type
      } else {
        log.warn(`line ${token.line}:\nNo explicit cast or context-given type for pointer lookup, defaulting to 'int'`)
        type = "int"
      }

      let size = data_type_size[type]
      let temp_buffer = alloc_block(size)

      // make pointer value available
      prefix.push(...addr_prefix)

      // copy pointer value into temp ram word
      let pointer_addr = get_temp_word()
      prefix.push(`write ${addr_value} ${pointer_addr.label}`)

      // lookup pointer value and copy into temp buffer
      prefix.push(`copy [${pointer_addr.label}] ram.${temp_buffer[0]}`)

      // if the target type is more than one word, copy more words
      if (size > 1) {
        prefix.push(`copy ${pointer_addr.label} alu.1`)

        for (let i = 1; i < size; i++) {
          prefix.push(`write ${i} alu.2`)
          prefix.push(`copy [alu.+] ram.${temp_buffer[i]}`)
        }
      }

      // output registers are the values of the temp buffer
      registers = []
      for (let addr of temp_buffer) {
        registers.push(`[ram.${addr}]`)
      }

      pointer_addr.free()
    } break

    default:
      throw new CompError(`Error translating expression:\nUnknown type '${token.name}'`)
    }
    return [prefix, registers, type]

  } else if (token.type == "structure") {
    let result = []
    switch (token.name) {

    case "if": {
      let label = `if_${gen_id("if")}`

      let else_present = false
      let else_if_present = false
      let exprs = [args.expr]
      let main_tokens = [[]]
      let else_tokens = []
      let clause_number = 0
      let target = main_tokens[0]

      for (let item of token.body) {
        if (item.name == "else if") {
          clause_number++
          main_tokens.push([])
          exprs.push(item.arguments.expr)
          target = main_tokens[clause_number]
          else_if_present = true
        } else if (item.name == "else") {
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
        if (i != 0) {
          result.push(`${label}_${i}:`)
        }

        let next_case_label
        if (exprs.length == (i+1) && !else_present) {
          next_case_label = `${label}_end`
        } else {
          next_case_label = `${label}_${i+1}`
        }

        let prefix_and_value = translate(exprs[i], "bool")
        let prefix = prefix_and_value[0]
        let value = prefix_and_value[1]
        if (prefix_and_value[2] != "bool") {
          throw new CompError(`Conditional expression expected type 'bool', got '${prefix_and_value[2]}'`)
        }
        result.push(...prefix)
        result.push(`write ${value[0]} ctl.cnd`)
        result.push(`goto? ${next_case_label}`)

        result.push(...translate_body(main_tokens[i]))

        if ((else_present || else_if_present) && i != exprs.length) {
          result.push(`goto ${label}_end`)
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
      let label = `for_${gen_id("for")}`
      let init_result = translate(args.init)
      result.push(...init_result)

      let expr_prefix_and_value = translate(args.expr, "bool")
      let expr_prefix = expr_prefix_and_value[0]
      let expr_value = expr_prefix_and_value[1][0]
      if (expr_prefix_and_value[2] != "bool") {
        throw new CompError(`Conditional expression expected type 'bool', got '${expr_prefix_and_value[2]}'`)
      }
      result.push(...expr_prefix)
      result.push(`write ${expr_value} ctl.cnd`)
      result.push(`goto? ${label}_end`)
      result.push([(`${label}_start:`)])

      let prev_state = state.inner_structure_label
      state.inner_structure_label = label
      result.push(...translate_body(token.body))
      result.push(`${label}_cond:`)
      state.inner_structure_label = prev_state

      let cmd_result = translate(args.cmd)
      result.push(...cmd_result)

      result.push(...expr_prefix)
      result.push(`write ${expr_value} ctl.cnd`)
      result.push(`goto? ${label}_end`)
      result.push(`goto ${label}_start`)
      result.push(`${label}_end:`)
    } break

    case "while": {
      let label = `while_${gen_id("while")}`

      let prefix_and_value = translate(args.expr, "bool")
      let prefix = prefix_and_value[0]
      let value = prefix_and_value[1][0]
      if (prefix_and_value[2] != "bool") {
        throw new CompError(`Conditional expression expected type 'bool', got '${prefix_and_value[2]}'`)
      }
      result.push(...prefix)
      result.push(`write ${value} ctl.cnd`)
      result.push(`goto? ${label}_end`)
      result.push([(`${label}_start:`)])

      let prev_state = state.inner_structure_label
      state.inner_structure_label = label
      result.push(...translate_body(token.body))
      result.push(`${label}_cond:`)
      state.inner_structure_label = prev_state

      result.push(...prefix)
      result.push(`write ${value} ctl.cnd`)
      result.push(`goto? ${label}_end`)
      result.push(`goto ${label}_start`)
      result.push(`${label}_end:`)
    } break

    case "function_def": {
      assert_global_name_available(args.name)

      // init output area for generated code
      let label = `func_${args.name}:`
      state.funcs[args.name] = [label]
      let target = state.funcs[args.name]

      // save previous state.scope for later
      let old_state = state.scope
      state.scope = args.name
      log.debug(`namespace -> ${state.scope}`)

      // generate free ram and symbol table for this state.scope
      state.free_ram[state.scope] = gen_free_ram_map()
      state.symbol_table[args.name] = {}

      let data_type
      if (args.type === undefined) {
        data_type = "none"
      } else {
        data_type = args.type
      }
      assert_valid_datatype(data_type)

      // add entry in function table
      state.function_table[args.name] = {
        data_type: data_type,
        force_cast: args.force_cast,
        arguments: [],
        return_value: []
      }

      // translate the body of the function
      target.push(...translate_body(token.body))

      // restore previous state.scope
      state.scope = old_state
      log.debug(`namespace -> ${state.scope}`)

      // add return instruction unless it is already there
      if (target[target.length -1] !== "  return") {
        target.push("return")
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
    !nested && init_vars()
    if (input == "") {
      throw new CompError("No input", 0)
    }

  //tokenise
    log.info("Tokenising...")
    let t0 = timer()
    let tokens = []
    let prev_type = ""
    let prev_indent = 0
    let curr_indent = 0
    let token = {}
    let targ = [tokens]
    let expect_indent = false
    let include_block_mode = false
    for (let i = 0; i < input.length; i++) {
      let line = input[i].trim()   // remove any trailing whitesapce
      if (line == "" || line == "\n") { continue } // if it is a newline, skip it
      if (line == "///") {
        include_block_mode = ! include_block_mode
        continue
      }
      if (include_block_mode) {
        state.consts.push(line)
        continue
      }

      curr_indent = Math.floor(input[i].search(/\S|$/)/2)

      if (input[i].search(/\S|$/) % 2 != 0) {
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
            log.debug("new target ↓ [root]")
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

        if (token.type == "structure" && !(token.name in {"else":"","else if":""})) {     //when a structure header is parsed, set it to be target and expect indent
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

      if (!nested && Math.round((i+1) % (input.length/100)) == 0 ) {
        postMessage(["update",(((i+1)/input.length)*100)-50])
      }

      prev_indent = Math.floor(input[i].search(/\S|$/)/2)
    }

    let t1 = timer()

    log.info(`↳ success, ${input.length} line(s) in ${Math.round(t1-t0)} ms`)

  if (!nested) {
    token_dump = tokens
  }

  //translate
    log.info("Tranlsating...")
    t0 = timer()
    let output = ""
    let command = []
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type == "expression" && tokens[i].name != "function") {
        throw new CompError("Unexpected expression", tokens[i].line)
      }

      try {
        command = translate(tokens[i])
        if (tokens[i].name == "function") {
          command = command[0] // if it is a function call (which are expressions) take only the prefix and bin the result register [[tokens],result] -> [tokens]
          let function_type = state.function_table[tokens[i].arguments.name].data_type
          if (function_type !== "none") {
            log.warn(`line ${tokens[i].line}:\nDiscarding function's returned value of type '${function_type}'`)
          }
        }
        if (command.length >= 1) {
          output += command.join("\n")
          output += "\n"
        }
      } catch (error) {
        if (error instanceof CompError && error.line === undefined) { // if this is CompError with no line info
          throw new CompError(error.message, tokens[i].line) // add the line number to it
        } else {
          throw error
        }
      }

      if (!nested && Math.round((i+1) % (tokens.length/100)) == 0 ) {
        postMessage(["update",(((i+1)/tokens.length)*100)+50])
      }
    }
    output += "stop"

    t1 = timer()
    log.info(`↳ success, ${tokens.length} tokens(s) in ${Math.round(t1-t0)} ms`)

  //add state.consts
    for (let i = 0; i < state.consts.length; i++) {
      output += "\n" + state.consts[i]
    }

  //add function defs
    for (let item in state.funcs) {
      for (let line of state.funcs[item]) {
        output += "\n" + line
      }
    }

    output += "\n"

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

    let ram_percent = Math.round((state.max_allocated_ram_slots / 1023) * 100)

    let ram_message = `RAM use: ${ram_percent}% (${state.max_allocated_ram_slots}/1023 words)`
    if (typeof process === 'undefined') { // if we are running in a browser not nodejs
      ram_message += `<progress value="${state.max_allocated_ram_slots}" max="1023" class="ram-bar"></progress>`
    }
    log.info(ram_message)

    log.info(`Standard library functions used: ${Object.keys(state.required).length}`)
  }

  return output
}

log.info(`Compiler thread started, ${Object.keys(libs).length} standard functions loaded`)
