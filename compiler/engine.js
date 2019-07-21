if (typeof process !== 'undefined') {  // if we are running under nodejs define performance.now
  try {
    performance = { now : require('performance-now') }

    // bad hacks to work around nodejs
    if (process.pkg) { // packaged node mode
      let path = '/snapshot/b4c/compiler/libraries.js'
      if (process.platform === "win32") {
        path = "C:" + path
      }
      importScripts(path)
    } else {  // normal node mode
      importScripts('compiler/libraries.js')
    }
  } catch (e) {}
} else {  // running in browser (the sane one)
  importScripts('libraries.js')
}

let show_log_messages = true
let debug = false
let token_dump = []

const data_type_size = {"int":1,"sint":1,"long":2,"slong":2,"float":2,"bool":1,"str":1,"array":4,"none":0}
const reserved_keywords = {"if":"","for":"","while":"","def":"","true":"","false":"","sys.odd":"","sys":"","array":"","return":""}

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
        log.info(benchmark(msg.data[1]) + " lines/second")
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
  debug: (msg) => send_log(msg,"debug"),
  info: (msg) => send_log(msg,"info"),
  warn: (msg) => send_log(msg,"warn"),
  error: (msg) => send_log(msg,"error")
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
    return "line " + this.line + ": \n" + this.message
  }
}

function init_vars() {
  scope = "[root]"
  free_ram = {"[root]":gen_free_ram_map(),"[global]":gen_free_ram_map()}
  var_map = {"[root]":{},"[global]":{}}
  arg_map = {}
  name_type_map = {"[root]":{},"[global]":{}}
  const_map = {}
  return_map = {}
  consts = []
  func = {}
  required = {}
  max_allocated_ram_slots = 0
  structures = {"if":0,"for":0,"while":0,"str":0,"expr_array":0}
}

function pad(string, width) {
 return string.length >= width ? string : new Array(width - string.length + 1).join("0") + string
}

function CSVToArray(strData, strDelimiter){
  if (strData == "") {return []}
  strDelimiter = (strDelimiter || ",")
  var objPattern = new RegExp(
    ( "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
     "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
     "([^\"\\" + strDelimiter + "\\r\\n]*))" ),
     "gi" )
  var arrData = [[]]
  var arrMatches = null
  while (arrMatches = objPattern.exec( strData )){
    var strMatchedDelimiter = arrMatches[ 1 ]
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter){
      arrData.push([])
    }
    var strMatchedValue
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

  var lines = 0
  for (var lib of Object.values(libs)) {
    lines += lib.length
  }

  var total_time = 0
  for (var i = 0; i < iterations; i++) {
    init_vars()
    var t0 = performance.now()
    try {
      show_log_messages = false
      compile(["include *"], true)
    } finally {
      show_log_messages = true
    }
    var t1 = performance.now()
    total_time += t1 - t0
    if (Math.round((i+1) % (iterations/50)) == 0 ) {
      postMessage(["update",(i+1)/iterations*100])
    }
  }

  var avg_time = total_time / iterations
  return Math.round(lines / (avg_time/1000))
}

function all_matches(pattern, string) {
  var list = []
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
  var operators = all_matches(pattern,string)
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
  if (expr1["name"] == "var_or_const") {
    return translate(expr1)[2]
  } else if (expr2["name"] == "var_or_const") {
    return translate(expr2)[2]
  } else {
    return translate(expr1)[2]
  }
}

function set_token(name, operation, exprs, line) {
  var add = {"name":operation,"type":"expression","arguments":{"expr1":exprs[0],"expr2":exprs[1]}}
  var set_var = {"name":"set","type":"command","arguments":{"expr":add,"name":name},"line":line}
  return set_var
}

function gen_free_ram_map() {
  var map = []
  for (var x = 0; x < 1023; x++) { //last word of RAM is function return address
    map.push(x)
  }
  return map
}

function var_name_available(name) {
  if (name in const_map || name in var_map[scope]
  || name in var_map || name in reserved_keywords || name in var_map["[global]"]) {
    return false
  }
  if (typeof var_map[scope] === undefined) {
    return true
  }
  return true
}

function const_name_available(name) {
  if (name in const_map || name in var_map
  || name in reserved_keywords) {
    return false
  }
  for (var key in var_map) {
    if (name in var_map[key]) {
      return false
    }
  }
  return true
}

function is_argument(name) {
  if (arg_map[scope] === undefined) {
    return false
  }
  return name in arg_map[scope]
}

function gen_id(type) {
  var id = structures[type]
  structures[type] += 1
  if (id === undefined) {
    throw new CompError("Error generating ID:\nunknown structure '" + type + "'")
  }
  return id
}

function write_operands(expr1,expr2,type) {
  var result = []
  var [expr1_prefix, expr1_reg] = translate(expr1,type)
  var [expr2_prefix, expr2_reg] = translate(expr2,type)
  result.push.apply(result,expr1_prefix)
  result.push("write "+ expr1_reg +" alu.1")
  result.push.apply(result,expr2_prefix)
  result.push("write "+ expr2_reg +" alu.2")
  return result
}

function write_operand(expr,type) {
  var result = []
  var [expr_prefix, expr_reg] = translate(expr,type)
  result = expr_prefix
  result.push("write "+ expr_reg +" alu.1")
  return result
}

function alloc_block(size) {
  log.debug("Request for " + size + " words(s) of RAM")
  var addrs = []
  if (size > free_ram[scope].length) {
    throw new CompError("Out of memory, " + size + " word(s) requested (only "+ free_ram[scope].length +" free)")
  }
  for (var i = 0; i < size; i++) {
    addrs.push(free_ram[scope].shift())
  }

  if (!scope.startsWith("sys.")) {
    var allocated_slots = 1023 - free_ram[scope].length
    if (allocated_slots > max_allocated_ram_slots) {
      max_allocated_ram_slots = allocated_slots
    }
  }
  return addrs
}

function alloc_global_block(size) {
  var old_scope = scope
  scope = "[global]"
  var addrs = alloc_block(size)
  scope = old_scope

  return addrs
}

function free_global_block(addrs) {
  var old_scope = scope
  scope = "[global]"
  free_block(addrs)
  scope = old_scope
}


function check_datatype(type) {
  if (!(type in data_type_size)) {
    throw new CompError("Data type '" + type + "' unknown")
  } else {
    return type
  }
}

function free_block(addrs) {
  free_ram[scope].push.apply(free_ram[scope],addrs)
  free_ram[scope].sort(function(a,b) { return a - b })
}

function get_temp_word() {
  var id = alloc_block(1)
  var name = "ram."+id[0]
  return [id,name]
}

function translate_body(tokens) {
  log.debug("nested translate: " + tokens.length + " token(s)")
  var result = []
  if (tokens.length == 0) {
    return result
  }
  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i]["type"] == "expression" && tokens[i]["name"] != "function" || typeof tokens[i] === undefined) {
      throw new CompError("Unexpected expression", tokens[i].line)
    } else {
      try {
        var command = translate(tokens[i])
      } catch (error) {
        if (error instanceof CompError && error.line === undefined) { // if this is CompError with no line info
          throw new CompError(error.message, tokens[i].line) // add the line number to it
        } else {
          throw error
        }
      }
      if (tokens[i]["name"] == "function") {
        command = command[0] // if it is a function call (which is an expression) take only the prefix and bin the result register [[tokens],result] -> [tokens]
      }
      for (var j = 0; j < command.length; j++ ) {
        command[j] = "  " + command[j]
      }
      result.push.apply(result,command)
    }
  }
  return result
}

function load_lib(name) {
  log.debug("loading library object: " + name)
  if (!(name in libs)) {
    throw new CompError("Library '" + name + "' not found")
  }
  if (name in required) {
    log.debug("↳ already loaded")
  } else {
    required[name] = ""
    log.debug("↳ compiling")
    try {
      var old_log_status = show_log_messages
      show_log_messages = false
      compile(libs[name], true)
    } catch (error) {
      if (error instanceof CompError) { // if this is CompError with no line info
        // let the user know the error in the standard library - and not their fault
        throw new CompError(error.message, error.line + " [in library obj. '" + name + "']")
      } else {
        throw error
      }
    } finally {
      show_log_messages = old_log_status
    }
  }
}

function tokenise(input, line) {
  if (typeof input == "") {return []}
  var input = input.trim()
  var list = input.split(" ")
  var line = line || -1
  var token = {}

  if (/^\/\/([^/]+)/.test(input)) { // a comment begining with two "//"
    token = {"name":"comment","type":"command","arguments":{"comment":input}}

  } else if (/{(.+)}/.test(input)) {
    token = {"name":"asm","type":"command","arguments":{"value":/{(.+)}/.exec(input)[1]}}

  } else if (/^\"(.+)\"$|^(\"\")$/.test(input)) {     //string
    token = {"name":"str","type":"expression","arguments":{"value":input,"type_guess":"str"}}

  } else if (list[0] == "var") {                       // var [type] [name] <expr>
    if (list.length >= 4) {
      var expr = tokenise(list.slice(3).join(" "), line) // extract all the letters after command
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError("Invalid name: '"+list[2]+"'")}
      token = {"name":"var_alloc","type":"command","arguments":{"type":list[1],"name":list[2],"expr":expr}}
    } else if (list.length > 2) {
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError("Invalid name: '"+list[2]+"'")}
      token = {"name":"var_alloc","type":"command","arguments":{"type":list[1],"name":list[2]}}
    } else {
      throw new CompError("Variable decleration syntax:\nvar [type] [name] <expr>")
    }

  } else if (list[0] == "arg") {                      // arg [type] [name] <expr>
    if (list.length >= 4) {
      var expr = tokenise(list.slice(3).join(" "), line) // extract all the letters after command
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError("Invalid name: '"+list[2]+"'")}
      token = {"name":"arg_alloc","type":"command","arguments":{"type":list[1],"name":list[2],"expr":expr}}
    } else if (list.length > 2) {
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError("Invalid name: '"+list[2]+"'")}
      token = {"name":"arg_alloc","type":"command","arguments":{"type":list[1],"name":list[2]}}
    } else {
      throw new CompError("Argument decleration syntax:\narg [type] [name] <expr>")
    }

  } else if (list[0] == "const") {             // const [type] [name] [expr]
    if (list.length >= 4) {
      var expr = tokenise(list.slice(3).join(" "), line) // extract all the letters after command
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError("Invalid name: '"+list[2]+"'")}
      token = {"name":"const_alloc","type":"command","arguments":{"type":list[1],"name":list[2],"expr":expr}}
    } else if (list.length > 2) {
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError("Invalid name: '"+list[2]+"'")}
      token = {"name":"const_alloc","type":"command","arguments":{"type":list[1],"name":list[2]}}
    } else {
      throw new CompError("Constant decleration syntax:\nconst [type] [name] <expr>")
    }

  } else if (list[0] == "global") {             // global [type] [name] [expr]
    if (list.length >= 4) {
      var expr = tokenise(list.slice(3).join(" "), line) // extract all the letters after command
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError("Invalid name: '"+list[2]+"'")}
      token = {"name":"global_alloc","type":"command","arguments":{"type":list[1],"name":list[2],"expr":expr}}
    } else if (list.length > 2) {
      if (!/(?=^\S*)[a-zA-Z_][a-zA-Z0-9_]*/.test(list[2])) { throw new CompError("Invalid name: '"+list[2]+"'")}
      token = {"name":"global_alloc","type":"command","arguments":{"type":list[1],"name":list[2]}}
    } else {
      throw new CompError("Global decleration syntax:\nglobal [type] [name] <expr>")
    }

  } else if (list[0] == "if") {               // if [bool]
    if (list.length > 1) {
      var expr = tokenise(list.slice(1).join(" "), line) // extract all the letters after command
      token = {"name":"if","type":"structure","body":[],"arguments":{"expr":expr}}
    } else {
      throw new CompError("If statement has no conditional expression")
    }

  } else if (/^(else)$/.test(input)) {         //else
    token = {"name":"else","type":"structure","arguments":{}}

  } else if (/(else\sif)/.test(input)) {      //else if
    if (list.length > 2) {
      var expr = tokenise(list.slice(2).join(" "), line) // extract all the letters after command
      token = {"name":"else if","type":"structure","arguments":{"expr":expr}}
    } else {
      throw new CompError("Else If statement has no conditional expression")
    }

  } else if (list[0] == "while") {              // while [bool]
    if (list.length > 1) {
      var expr = tokenise(list.slice(1).join(" "), line) // extract all the letters after command
      token = {"name":"while","type":"structure","body":[],"arguments":{"expr":expr}}
    } else {
      throw new CompError("While statement has no conditional expression")
    }

   } else if (list[0] == "for") {               // for [cmd];[bool];[cmd]
    if (list.length > 1) {
      var string_list = input.slice(3).split(";")
      var init = tokenise(string_list[0],line)
      var expr = tokenise(string_list[1],line)
      var cmd = tokenise(string_list[2],line)
      token = {"name":"for","type":"structure","body":[],"arguments":{"init":init,"expr":expr,"cmd":cmd}}
    } else {
      throw new CompError("Missing cmd/bool/cmd list")
    }

  } else if (list[0] == "def") {                  //def [name] [opt. return type]       need to check if name is availiable
    if (list.length < 2) {
      throw new CompError("Functions require a name")
    } else if (list.length > 3) {
      throw new CompError("Invalid syntax")
    }
    token = {"name":"function_def","type":"structure","body":[],"arguments":{"name":list[1],"type":list[2]}}

  } else if (list[0] == "free") {                 // free [name]
    token = {"name":"delete","type":"command","arguments":{"name":list[1]}}

  } else if (/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=].*)$/.test(input)) {                    // [name] = [expr]
    var matches = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=].*)$/.exec(input)
    var expr = tokenise(matches[2], line)
    token = {"name":"set","type":"command","arguments":{"expr":expr,"name":matches[1]}}

  } else if (/^\*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=].*)$/.test(input)) {                    // *[pointer] = [expr]
    var matches = /^\*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=].*)$/.exec(input)
    var expr = tokenise(matches[2], line)
    token = {"name":"pointer_set","type":"command","arguments":{"expr":expr,"name":matches[1]}}

  } else if (list[0] == "return") {                    // return
    var expr = undefined
    var expr_string = list.slice(1).join(" ")

    if (expr_string !== "") {
      expr = tokenise(expr_string, line)
    }

    token = {"name":"return","type":"command","arguments":{"expr":expr}}

  } else if (list[1] == "+=") {                    // [name] += [expr]
    var expr = tokenise(list.slice(2).join(" "), line)
    token = {"name":"increment","type":"command","arguments":{"expr":expr,"name":list[0]}}

  } else if (list[1] == "-=") {                    // [name] -= [expr]
    var expr = tokenise(list.slice(2).join(" "), line)
    token = {"name":"decrement","type":"command","arguments":{"expr":expr,"name":list[0]}}

  } else if (/.+?(?=\+\+)/.test(input)) { //  [name]++
    token = {"name":"increment_1","type":"command","arguments":{"name":/.+?(?=\+\+)/.exec(input)}}

  } else if (/.+?(?=\-\-)/.test(input)) { //  [name]--
    token = {"name":"decrement_1","type":"command","arguments":{"name":/.+?(?=\-\-)/.exec(input)}}

  } else if (/^\*(\(.*\))?([a-zA-Z_][a-zA-Z0-9_]*)$/.test(input)) {                    // pointer lookup
    var matches = /^\*(\(.*\))?([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(input)
    var type_cast = undefined
    if(matches[1] !== undefined) {
      type_cast = matches[1].slice(1, -1)
    }
    var var_or_const_name = matches[2]
    token = {"name":"pointer_lookup","type":"expression","arguments":{"type_cast":type_cast,"var_or_const_name":var_or_const_name}}

  } else if (/^\((.*)\)$/.test(input)) {  // it is an expression that is in brackets
    var expression = /^\((.*)\)$/.exec(input)[1]
    log.warn("tokenising '" + expression + "'")
    var token = tokenise(expression,line)
    if (token["type"] != "expression") {
      throw new CompError("Only expressions may be placed in brackets")
    }
    token = {"name":"bracket","type":"expression","arguments":{"expr":token}}

  } else if (/(^\d+$)|(^0b[10]+$)|(^0x[0-9a-fA-F]+$)/.test(input)) { //        [unsigned integer]   is dec/hex/bin number only
    var dec_val = parse_int(input)
    if (dec_val > 65535) {
      var guess = "long"
    } else {
      var guess = "int"
    }
    token = {"name":"number","type":"expression","arguments":{"value":input,"type_guess":guess}}

  } else if (/(^[+-]?\d+$)|(^-?0b[10]+$)|(^-?0x[0-9a-fA-F]+$)/.test(input)) { //   [signed integer]
    var dec_val = parse_int(input)
    if (Math.abs(dec_val) > 32767) {
      var guess = "slong"
    } else {
      var guess = "sint"
    }
    token = {"name":"number","type":"expression","arguments":{"value":input,"type_guess":guess}}

  } else if (list[0] == "include") {
    token = {"name":"include","type":"command","arguments":{"name":list[1]}}

  } else if (/^([a-zA-Z_][a-zA-Z0-9_]*)\.(append|insert)\((.*)\)$/.test(input)) {   // array function ie. array_name.insert/append(args)
    var matches = /^([a-zA-Z_][a-zA-Z0-9_]*)\.(append|insert)\((.*)\)$/.exec(input)
    var array_name = matches[1]
    var operation = matches[2]
    var argument_string = matches[3]
    var arguments = argument_string.split(",")

    var argument_tokens = []

    for (var argument of arguments) {
      argument_tokens.push(tokenise(argument,line))
    }

    token = {"name":"array_function","type":"command","arguments":{
      "name": array_name,
      "operation": operation,
      "exprs": argument_tokens
       }
    }

  } else if (/^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]\s*=\s*(.*)$/.test(input)) {       //array set ie array_name[index] = some value
    var matches = /^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]\s*=\s*(.*)$/.exec(input)
    var array_name = matches[1]
    var index_expression = matches[2]
    var value = matches[3]

    token = {"name":"array_set","type":"command","arguments":{
      "name": array_name,
      "index_expr": tokenise(index_expression,line),
      "expr": tokenise(value,line)
      }
    }

  } else if (/^([a-zA-Z_][a-zA-Z0-9_]*)\.(len|pop|max_len)\(\)$/.test(input)) {       //array function ie array_name.pop/len()
    var matches = /^([a-zA-Z_][a-zA-Z0-9_]*)\.(len|pop|max_len)\(\)$/.exec(input)
    var array_name = matches[1]
    var operation = matches[2]

    token = {"name":"array_expression","type":"expression","arguments":{
      "name": array_name,
      "operation": operation
      }
    }

  } else if (/^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]$/.test(input)) {       //array expression ie array_name[index]
    var matches = /^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]$/.exec(input)
    var array_name = matches[1]
    var index_expression = matches[2]

    token = {"name":"array_expression","type":"expression","arguments":{
      "name": array_name,
      "operation": "index",
      "expr": tokenise(index_expression,line)
      }
    }

  } else if (/^\S+?(?=\((.*)\)$)/.test(input)) { // function call [name](*)
    var name = /^\S+?(?=\((.*)\)$)/.exec(input)[0]
    var args_string = /^\S+?(?=\((.*)\)$)/.exec(input)[1]
    var string_list = args_string.split(",")
    var arguments = []
    if (args_string !== "") {
      for (var item of string_list) {
        if (item !== undefined) {
          arguments.push(tokenise(item,line))
        }
      }
    }
    token = {"name":"function","type":"expression","arguments":{"name":name,"exprs":arguments}}

  } else if (/(>> 8)|(>>)|(<<)|(!=)|(<=)|(>=)|[\+\-\*\/\!\<\>\&\^\|\%:]|(==)|(\.\.)|(sys\.ov)|(sys\.odd)/.test(input)) {          // is an expression
    var operation = find_operation(/(>> 8)|(>>)|(<<)|(!=)|(<=)|(>=)|[\+\-\*\/\!\<\>\&\^\|\%:]|(==)|(\.\.)|(sys\.ov)|(sys\.odd)/g, input)
    if (operation in {"+":"", "-":"", "/":"", "*":"", "^":"", "%":""}) { // dual operand [non bool]
      var args = input.split(operation)
      var expr1 = tokenise(args[0], line)
      var expr2 = tokenise(args[1], line)
      token = {"name":operation,"type":"expression","arguments":{"expr1":expr1,"expr2":expr2}}

    } else if (operation in {">":"", "<":"","==":"","!=":"", "&":"", ">=":"", "<=":"", "|":"", "..":"", ":":""}) { // dual operand [bool]
      var args = input.split(operation)
      var expr1 = tokenise(args[0], line)
      var expr2 = tokenise(args[1], line)
      token = {"name":operation,"type":"expression","arguments":{"expr1":expr1,"expr2":expr2}}

    } else if (operation in {">>":"", "<<":"", "!":"", ">> 8":""}) { // single operand [non-bool]
      var args = CSVToArray(input,operation)
      var expr = tokenise(args[0][0], line)
      token = {"name":operation,"type":"expression","arguments":{"expr":expr}}

    } else if (operation == "sys.odd") {
      var args = /([^\n\r]*)sys.odd\s*/.exec(input)
      var expr = tokenise(args[1], line)
      token = {"name":"is_odd","type":"expression","arguments":{"expr":expr}}

    } else if (operation == "sys.ov") {
      token = {"name":"overflow","type":"expression","arguments":{}}

    } else {
      throw new CompError("Unknown operation: " + operation)
    }

  } else if (/(^true$)|(^false$)/.test(input)) {    //is true/false (the reserved keywords for bool data type)
    if (input == "true") {
      var value = "1"
    } else {
      var value = "0"
    }
    token = {"name":"number","type":"expression","arguments":{"value":value,"type_guess":"bool"}}

  } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input) ) {                       //variable or const (by name)
    token = {"name":"var_or_const","type":"expression","arguments":{"name":input}}

  } else if (/^((\(.*\))?(\[.*\]))$/.test(input)) {                          //array of expressions
    var matches = /^((\(.*\))?(\[.*\]))$/.exec(input)

    var type_size = undefined
    if(matches[2] !== undefined) {
      var type_size_string = matches[2].slice(1, -1)
      type_size = type_size_string.split(",")
    }

    var elements_string = matches[3].slice(1, -1)
    var elements_array = elements_string.split(",")
    var token_array = []

    for (var item of elements_array) {
      token_array.push(tokenise(item,line))
    }

    token = {"name":"expr_array","type":"expression",
      "arguments":{
      "exprs":token_array,
      "type_size":type_size
    }}

  } else {
    throw new CompError("Invalid syntax: '" + input + "'")
  }

  token["line"] = line
  return token
}

function translate(token, ctx_type) {
  var args = token["arguments"]
  if (token["type"] == "command") {

    var result = []
    switch(token["name"]) {

    case "asm":
      result = [args["value"]]
      break

    case "var_alloc":     //var [name] [type] <expr>
      check_datatype(args["type"])
      if (args["type"] == "array") {
        token["name"] = "var_array_alloc"
        result = translate(token)
        break
      }

      if (!var_name_available(args["name"])) {
        throw new CompError("Variable name: '" + args["name"] + "' is not available")
      }

      if ("expr" in args) {
        var token = args["expr"]
      } else if (args["type"] == "str") {
        var token = tokenise('""')
      } else {
        var token = tokenise("0")
      }

      var prefix_registers_type = translate(token,args["type"])
      var prefix = prefix_registers_type[0]
      var registers = prefix_registers_type[1]
      if (args["type"] != prefix_registers_type[2]) {
        throw new CompError("Wrong data type, expected '"+ args["type"] +"', got '"+ prefix_registers_type[2] +"'")
      }
      var type = args["type"]
      var size = registers.length
      log.debug("var alloc '"+type+"', size '"+size+"'")

      var memory = alloc_block(size)

      var_map[scope][args["name"]] = memory.slice()
      name_type_map[scope][args["name"]] = type

      result = prefix

      for (var register of registers) {
        result.push("write " + register + " ram." + memory.shift())
      }
      break

    case "const_alloc":     //const [name] [type] [expr]
      check_datatype(args["type"])

      if (!const_name_available(args["name"])) {
        throw new CompError("Error allocating constant: '" + args["name"] + "' is not available")
      }

      if ("expr" in args) {
        var token = args["expr"]
      } else if (args["type"] == "str") {
        var token = tokenise('""')
      } else {
        var token = tokenise("0")
      }

      if (token["name"] != "number" && token["name"] != "str") {
        throw new CompError("Constant must be static values")
      }

      var prefix_registers_type = translate(token,args["type"])
      var registers = prefix_registers_type[1]
      if (args["type"] != prefix_registers_type[2]) {
        throw new CompError("Wrong data type, expected '"+ args["type"] +"', got '"+ prefix_registers_type[2] +"'")
      }
      var type = args["type"]
      var size = registers.length
      log.debug("const alloc '"+type+"', size '"+size+"'")

      var id = "const_" + args["name"]
      var memory = []
      for (var i = 0; i < size; i++) {
        memory.push(id + "_" + i)
      }

      const_map[args["name"]] = memory.slice()
      name_type_map["[root]"][args["name"]] = args["type"]

      for (var register of registers) {
        consts.push(memory.shift()+":")
        consts.push(register)
      }
      break

    case "global_alloc":     //global [name] [type] <expr>
      check_datatype(args["type"])
      if (args["type"] == "array") {
        token["name"] = "global_array_alloc"
        result = translate(token)
        break
      }

      if (!var_name_available(args["name"])) {
        throw new CompError("Variable name: '" + args["name"] + "' is not available")
      }

      if ("expr" in args) {
        var token = args["expr"]
      } else if (args["type"] == "str") {
        var token = tokenise('""')
      } else {
        var token = tokenise("0")
      }

      var prefix_registers_type = translate(token,args["type"])
      var prefix = prefix_registers_type[0]
      var registers = prefix_registers_type[1]
      if (args["type"] != prefix_registers_type[2]) {
        throw new CompError("Wrong data type, expected '"+ args["type"] +"', got '"+ prefix_registers_type[2] +"'")
      }
      var type = args["type"]
      var size = registers.length
      log.debug("global alloc '"+type+"', size '"+size+"'")

      var memory = alloc_global_block(size)

      var_map["[global]"][args["name"]] = memory.slice()
      name_type_map["[global]"][args["name"]] = type

      // make data available
      result = prefix

      for (var register of registers) {
        result.push("write " + register + " ram^." + memory.shift())
      }
      break

    case "arg_alloc":       //arg [name] [type] [expr]
      if (scope == "[root]") {
        throw new CompError("Argument declaration can only be used in functions")
      }

      check_datatype(args["type"])

      if (!var_name_available(args["name"])) {
        throw new CompError("Error allocating argument: '" + args["name"] + "' is not available")
      }

      if ("expr" in args) {
        var token = args["expr"]
      } else if (args["type"] == "str") {
        var token = tokenise('""')
      } else {
        var token = tokenise("0")
      }

      var prefix_registers_type = translate(token,args["type"])
      var prefix = prefix_registers_type[0]
      var registers = prefix_registers_type[1]
      if (args["type"] != prefix_registers_type[2]) {
        throw new CompError("Wrong data type, expected '"+ args["type"] +"', got '"+ prefix_registers_type[2] +"'")
      }
      var type = args["type"]
      var size = registers.length
      log.debug("arg alloc '"+type+"', size '"+size+"'")

      var memory = alloc_block(size)

      var_map[scope][args["name"]] = memory.slice()
      arg_map[scope][args["name"]] = memory.slice()
      name_type_map[scope][args["name"]] = type

      result = prefix

      for (var register of registers) {
        result.push("write " + register + " ram." + memory.shift())
      }

      var label = "func_" + scope + "_" + args["name"] + ":"
      result.push(label)
      break

    case "var_array_alloc":
      if (!var_name_available(args["name"])) {
        throw new CompError("Variable name: '" + args["name"] + "' is not available")
      }

      var array_information = translate(args["expr"])[1]

      var base_addr = array_information[0]
      var max_length = array_information[1]
      var item_size = array_information[2]
      var length = array_information[3]

      name_type_map[scope][args["name"]] = "array"
      name_type_map[scope][args["name"]+".contained_type"] = name_type_map[scope][base_addr]
      name_type_map[scope][args["name"]+".contained_size"] = item_size

      log.debug("var_array alloc type '" + name_type_map[scope][base_addr] + "' length " + max_length)

      var header_memory = alloc_block(4)
      var array_memory = alloc_block(max_length * item_size)

      var_map[scope][args["name"]] = header_memory.slice()
      result.push("write ram." + array_memory[0] + " ram."+header_memory.shift())
      result.push("write " + max_length + " ram."+header_memory.shift())
      result.push("write " + item_size + " ram."+header_memory.shift())
      result.push("write " + length + " ram."+header_memory.shift())

      var_map[scope][args["name"]+".block"] = array_memory.slice()

      //call function to copy inital values to array
      load_lib("sys.rom_to_ram_copy")
      result.push("write "+ base_addr +" ram+.0")
      result.push("write ram."+ array_memory[0] +" ram+.1")
      result.push("write "+ (length * item_size).toString() + " ram+.2")
      result.push("call func_sys.rom_to_ram_copy_length")
      break

    case "global_array_alloc":
      if (!var_name_available(args["name"])) {
        throw new CompError("Variable name: '" + args["name"] + "' is not available")
      }

      var array_information = translate(args["expr"])[1]

      var base_addr = array_information[0]
      var max_length = array_information[1]
      var item_size = array_information[2]
      var length = array_information[3]

      name_type_map["[global]"][args["name"]] = "array"
      name_type_map["[global]"][args["name"]+".contained_type"] = name_type_map["[root]"][base_addr]
      name_type_map["[global]"][args["name"]+".contained_size"] = item_size

      log.debug("global_array alloc type '" + name_type_map["[global]"][base_addr] + "' length " + max_length)

      var header_memory = alloc_global_block(4)
      var array_memory = alloc_global_block(max_length * item_size)

      var_map["[global]"][args["name"]] = header_memory.slice()
      result.push("write ram^." + array_memory[0] + " ram^."+header_memory.shift())
      result.push("write " + max_length + " ram^."+header_memory.shift())
      result.push("write " + item_size + " ram^."+header_memory.shift())
      result.push("write " + length + " ram^."+header_memory.shift())

      var_map["[global]"][args["name"]+".block"] = array_memory.slice()

      //call function to copy inital values to array
      load_lib("sys.rom_to_global_ram_copy")
      result.push("write "+ base_addr +" ram+.0")
      result.push("write ram."+ array_memory[0] +" ram+.1")
      result.push("write "+ (length * item_size).toString() + " ram+.2")
      result.push("call func_sys.rom_to_global_ram_copy_length")
      break

    case "set":             //[name] = [expr]
      if (args["name"] in var_map[scope]) {
        var dst_regs = var_map[scope][args["name"]]
        var dst_type = name_type_map[scope][args["name"]]

        var prefix_value_type = translate(args["expr"],dst_type)
        var prefix = prefix_value_type[0]
        var regs = prefix_value_type[1]
        var type = prefix_value_type[2]

        if (type != dst_type) {
          throw new CompError("Variable expected type '"+dst_type+"', got '"+type+"'")
        }
        result = prefix

        for (var i = 0; i < dst_regs.length; i++) {
          result.push("write " + regs[i] + " ram." + dst_regs[i])
        }

      } else if (args["name"] in var_map["[global]"]) {
        var dst_regs = var_map["[global]"][args["name"]]
        var dst_type = name_type_map["[global]"][args["name"]]

        var prefix_value_type = translate(args["expr"],dst_type)
        var prefix = prefix_value_type[0]
        var regs = prefix_value_type[1]
        var type = prefix_value_type[2]

        if (type != dst_type) {
          throw new CompError("Variable expected type '"+dst_type+"', got '"+type+"'")
        }
        result = prefix

        for (var i = 0; i < dst_regs.length; i++) {
          result.push("write " + regs[i] + " ram^." + dst_regs[i])
        }

      } else {
        throw new CompError("Error looking up variable '" + args["name"] + "' is undefined")
      }
      break

    case "pointer_set":             //*[pointer] = [expr]
      var prefix_value_type = translate(args["expr"])
      var prefix = prefix_value_type[0]
      var regs = prefix_value_type[1]
      var type = prefix_value_type[2]
      var size = data_type_size[type]

      result = prefix

      var pointer_expr = tokenise(args["name"])
      var pointer_prefix_value_type = translate(pointer_expr,"int")
      var pointer_regs = pointer_prefix_value_type[1]

      if (pointer_prefix_value_type[2] != "int") {
        throw new CompError("Pointers must be of type 'int', got '" + pointer_prefix_value_type[2] + "'")
      }

      log.debug("type: '"+type+"', size: '"+size+"'")

      result.push("write " + regs[0] + " " + pointer_regs[0])

      if (size > 1) {
        result.push("write " + pointer_regs[0] + " alu.1")

        for (var i = 1; i < size; i++) {
          result.push("write " + i + " alu.2")
          result.push("write " + regs[i] + " [alu.+]")
        }
      }

      break

    case "array_set":
      // TODO make work with global arrays
      var array_name = args["name"]
      var index_expr = args["index_expr"]
      var expr = args["expr"]

      var prefix_value_type = translate(index_expr,"int")
      if (prefix_value_type[2] != "int") {
        throw new CompError("Array indexes must be of type 'int'")
      }
      result.push.apply(result,prefix_value_type[0])

      var scope_name
      var ram_prefix
      if (array_name in var_map[scope]) {
        // this is a local array
        scope_name = scope
        ram_prefix = "ram."
      } else if (array_name in var_map["[global]"]) {
        // this is a global array
        scope_name = "[global]"
        ram_prefix = "ram^."
      } else {
        throw new CompError("Cannot find array named '" + array_name + "'")
      }

      var array_information = var_map[scope_name][array_name]
      var array_type = name_type_map[scope_name][array_name+".contained_type"]

      var index = prefix_value_type[1]
      var base_addr = "["+ram_prefix+array_information[0]+"]"
      var item_size_as_register = "["+ram_prefix+array_information[2]+"]"
      var item_size_as_number = name_type_map[scope_name][array_name+".contained_size"]

      //calculate address of the specified index
      load_lib("sys.array_pointer")
      result.push("write "+index+" ram+.0")
      result.push("write "+item_size_as_register+" ram+.1")
      result.push("write "+base_addr+" ram+.2")
      result.push("call func_sys.array_pointer_base_addr") //output is in ram+.3

      var temp_var = get_temp_word()
      result.push("write [ram+.3] " + temp_var[1])
      var target_addr = "["+temp_var[1]+"]"

      //evaluate the expression and put the result in a buffer area
      var prefix_value_type = translate(expr, array_type)
      if (prefix_value_type[2] != array_type) {
        throw new CompError("Array expected type '" +array_type+ "', got '" + prefix_value_type[2] + "'")
      }
      result.push.apply(result,prefix_value_type[0])
      var memory = alloc_block(item_size_as_number)
      var buffer = memory.slice()

      for (var register of prefix_value_type[1]) {
        result.push("write " + register + " ram." + buffer.shift())
      }

      var source_addr = "ram."+memory[0]

      //copy value of expr into correct position in array
      result.push("write "+source_addr+" ram+.0")
      result.push("write "+target_addr+" ram+.1")
      result.push("write "+item_size_as_register+ " ram+.2")

      // if this is a global array we need a different copy function
      if (scope_name === "[global]") {
        load_lib("sys.ram_to_global_ram_copy")
        result.push("call func_sys.ram_to_global_ram_copy_length")
      } else {
        load_lib("sys.ram_to_ram_copy")
        result.push("call func_sys.ram_to_ram_copy_length")
      }

      free_block(temp_var[0])
      free_block(memory)
      break

    case "array_function":
      var array_name = args["name"]
      var operation = args["operation"]

      var scope_name
      var ram_prefix
      if (array_name in var_map[scope]) {
        // this is a local array
        scope_name = scope
        ram_prefix = "ram."
      } else if (array_name in var_map["[global]"]) {
        // this is a global array
        scope_name = "[global]"
        ram_prefix = "ram^."
      } else {
        throw new CompError("Cannot find array named '" + array_name + "'")
      }

      var array_information = var_map[scope_name][array_name]
      var type = name_type_map[scope_name][array_name+".contained_type"]
      var item_size_as_number = name_type_map[scope_name][array_name+".contained_size"]

      if (operation == "append") {
        var expr = args["exprs"][0]
        //append just puts the given value at the current end of the list, then adds 1 to the size of the list

        var index = "["+ram_prefix+array_information[3]+"]"
        var base_addr = "["+ram_prefix+array_information[0]+"]"
        var item_size_as_register = "["+ram_prefix+array_information[2]+"]"

        //put item at the specified index by evaluating set token
        var token = {"name":"array_set","type":"command","arguments":{
          "name": array_name,
          "index_expr": {
            "name":"array_expression",
            "type":"expression",
            "arguments":{
              "name":array_name,
              "operation":"len"}
            },
          "expr": args["exprs"][0]
        }}
        result.push.apply(result,translate(token))

        //increment the curret length of the array to reflect the change
        var current_index = ram_prefix + array_information[3]
        result.push("write ["+ current_index +"] alu.1")
        result.push("write 1 alu.2")
        result.push("write [alu.+] " + current_index)

      } else if (operation == "insert") {
        var index_expression = args["exprs"][0]
        var item_expression = args["exprs"][1]

        //evaluate the expression that gives the index
        var prefix_value_type = translate(index_expression,"int")
        if (prefix_value_type[2] != "int") {
          throw new CompError("Array indexes must be of type 'int'")
        }
        result.push.apply(result,prefix_value_type[0])

        var index = prefix_value_type[1]
        var base_addr = "["+ram_prefix+array_information[0]+"]"
        var item_size_as_register = "["+ram_prefix+array_information[2]+"]"
        var current_length = "["+ram_prefix+array_information[3]+"]"

        var temp_var1 = get_temp_word()
        var temp_var2 = get_temp_word()

        //calculate address of the specified index and index+1
        load_lib("sys.array_pointer")
        result.push("write "+index+" ram+.0")
        result.push("write "+item_size_as_register+" ram+.1")
        result.push("write "+base_addr+" ram+.2")
        result.push("call func_sys.array_pointer_base_addr") //output is in ram+.3

        result.push("write [ram+.3] " + temp_var1[1])
        result.push("write [ram+.3] alu.1")
        result.push("write "+item_size_as_register+ " alu.2")
        result.push("write [alu.+] "+ temp_var2[1])

        var source_addr = "["+temp_var1[1]+"]"
        var target_addr = "["+temp_var2[1]+"]"

        //calculate the length of the array in memory
        load_lib("sys.int_multiply")
        result.push("write "+item_size_as_register+ " ram+.0")
        result.push("write "+current_length+ " ram+.1")
        result.push("call func_sys.int_multiply_b")

        var length_to_shift = "[ram+.2]"

        //shift entire array (that is below the specified poisiton) one item_size down
        result.push("write "+source_addr+" ram+.0")
        result.push("write "+target_addr+" ram+.1")
        result.push("write "+length_to_shift+ " ram+.2")

        // if this is a global array we need a different copy function
        if (scope_name === "[global]") {
          load_lib("sys.global_ram_to_global_ram_copy")
          result.push("call func_sys.global_ram_to_global_ram_copy_length")
        } else {
          load_lib("sys.ram_to_ram_copy")
          result.push("call func_sys.ram_to_ram_copy_length")
        }

        //put item at the specified index
        var token = {"name":"array_set","type":"command","arguments":{
          "name": array_name,
          "index_expr": args["exprs"][0],
          "expr": args["exprs"][1]
        }}
        result.push.apply(result,translate(token))

        //add one to length
        result.push("write " + current_length + " alu.1")
        result.push("write 1 alu.2")
        result.push("write [alu.+] " +ram_prefix + array_information[3])

        free_block(temp_var1[0])
        free_block(temp_var2[0])

      } else {
        throw new CompError("not implemented")
      }
      break

    case "delete":           //free [name]
      var name = args["name"]
      if (is_argument(name) || name in const_map) {
        throw new CompError("'" + name + "' is not a variable")
      }
      if (name in var_map[scope]) {
        //if its an array, also free up the block that houses its elements
        if ( name_type_map[scope][name] == "array") {
          free_block(var_map[scope][name+".block"])
          delete var_map[scope][name+".block"]
        }
        free_block(var_map[scope][name])
        delete var_map[scope][name]
        delete name_type_map[scope][name]
      } else if (name in var_map["[global]"]) {
        free_global_block(var_map["[global]"][name])
        delete var_map["[global]"][name]
        delete name_type_map["[global]"][name]
      } else {
        throw new CompError("Can't free variable: '" + args["name"] + "' is undefined")
      }
      break

    //all the cmds below are just shortcuts for set tokens
    //i.e. a++    becomes a = a + 1
    case "increment_1":  //[name]++
      var variable = {"name":"var_or_const","type":"expression","arguments":{"name":args["name"]}}
      var number = {"name":"number","type":"expression","arguments":{"value":"1","bool":true,"type_guess":"int"}}
      var token = set_token(args["name"],"+",[variable,number],args["line"])
      var prefix = translate(token,name_type_map[scope][args["name"]])
      result = prefix
      break

    case "decrement_1":  //[name]--
      var variable = {"name":"var_or_const","type":"expression","arguments":{"name":args["name"]}}
      var number = {"name":"number","type":"expression","arguments":{"value":"1","bool":true,"type_guess":"int"}}
      var token = set_token(args["name"],"-",[variable,number],args["line"])
      var prefix = translate(token,name_type_map[scope][args["name"]])
      result = prefix
      break

    case "increment":  //[name] += [expr]
      var variable = {"name":"var_or_const","type":"expression","arguments":{"name":args["name"]}}
      var token = set_token(args["name"],"+",[variable,args["expr"]],args["line"])
      var prefix = translate(token,name_type_map[scope][args["name"]])
      result = prefix
      break

    case "decrement":  //[name] -= [expr]
      var variable = {"name":"var_or_const","type":"expression","arguments":{"name":args["name"]}}
      var token = set_token(args["name"],"-",[variable,args["expr"]],args["line"])
      var prefix = translate(token,name_type_map[scope][args["name"]])
      result = prefix
      break

    case "comment":    // comment (begins with //)
      result = [args["comment"]]
      break

    case "return":      //return [optional expr]
      if (scope === "[root]") {
        throw new CompError("Statement 'return' can only be used in functions")
      }

      var func_type = name_type_map[scope][scope]
      if (func_type === "none" && args["expr"] !== undefined) {
        throw new CompError("Functions of type 'none' cannot return values")
      }

      // if the return statement should have an expression, evaluate it
      if (func_type !== "none") {

        var [prefix, value, expr_type] = translate(args["expr"], func_type)
        if (func_type.startsWith('[') && func_type.endsWith(']')) {
          // trim type to exclude square brackets
          func_type = func_type.slice(1,-1)

          // square brackets around the type means cast any return expression to this type, ignoring any mis-match
          log.warn(`Casting return expression of type '${expr_type}' to '${func_type}'`)

        } else if (expr_type !== func_type) {
          // the type of the expression in the return statement does not match the data type of the function
          throw new CompError(`Function returns type '${func_type}', but return expression is of type '${expr_type}'`)
        }

        // include the code to evaluate the expression
        result = prefix

        var map = []
        for (var item of value) {
          var temp = item.replace("ram","ram+")
          //this next replace prevents recursive function calls producing ram++++.x addresses
          map.push(temp.replace("ram++","ram+"))
        }
        return_map[scope] = map
      }

      // add the actual return instruction
      result.push("return")
      break

    case "include":
      if (args["name"] == "*") {
        for (var name in libs) {
          load_lib(name)
        }
      } else {
        load_lib(args["name"])
      }
      break

    default:
      throw new CompError("Error translating command:\nUnknown type '" + token["name"] + "'")
      break
    }
    return result
  } else if (token["type"] == "expression") {

    var prefix = []
    var registers = [""]
    var type = ctx_type
    var types = []
    switch (token["name"]) {
                                              //number types
    case "number": // a generic number that can be turned into the type required by the context
      if (ctx_type === undefined) {
        log.warn("line " + token["line"] + ":\nNo context-specified type for '" + args["value"] + "'\n assuming '" + args["type_guess"] + "''")
        type = args["type_guess"]
      } else {
        type = ctx_type
      }

      token = {"name":type,"type":"expression","arguments":{"value":args["value"]}}
      var prefix_register_type = translate(token)

      prefix = prefix_register_type[0]
      registers = prefix_register_type[1]
      break

    case "bool":
      if (!/(^[+]?\d+$)|(^0b[10]+$)|(^0x[0-9a-fA-F]+$)/.test(args["value"])) {
        throw new CompError("Invalid input for type 'bool'")
      }

      var dec_val = parse_int(args["value"])

      if (dec_val > 65535) {
        throw new CompError("Integer too large (2^16/65535 max)")
      }

      type = "bool"
      registers = [args["value"]]
      break

    case "int":
      if (!/(^[+]?\d+$)|(^0b[10]+$)|(^0x[0-9a-fA-F]+$)/.test(args["value"])) {
        throw new CompError("Invalid input for type 'int'")
      }

      var dec_val = parse_int(args["value"])

      if (dec_val > 65535) {
        throw new CompError("Integer too large (2^16/65535 max)")
      }

      type = "int"
      registers = [args["value"]]
      break

    case "sint":
      if (!/(^[+-]?\d+$)|(^-?0b[10]+$)|(^-?0x[0-9a-fA-F]+$)/.test(args["value"])) {
        throw new CompError("Invalid input for type 'sint'")
      }

      var negative = false
      if (args["value"].startsWith("-")) {
        args["value"] = args["value"].substring(1)
        negative = true
      }

      var dec_val = parse_int(args["value"])

      if (dec_val > 32767) {
        throw new CompError("Signed integer out of range (sign ± 2^15 bits max)")
      }

      if (dec_val == 0) {
        negative = false
      }

      var bin = 0

      if (negative) {
        bin = (0xffff - dec_val + 1).toString(2)
      } else {
        bin = dec_val.toString(2)
      }
      var word = "0b" + pad(bin,16)

      type = "sint"
      registers = [word]
      break

    case "long":
      if (!/(^[+]?\d+$)|(^0b[10]+$)|(^0x[0-9a-fA-F]+$)/.test(args["value"])) {
        throw new CompError("Invalid input for type 'long'")
      }

      var dec_val = parse_int(args["value"])

      if (dec_val > 4294967295) {
        throw new CompError("Integer out of range (2^32 / 4.29bn max)")
      }
      var bin = pad(dec_val.toString(2),32)
      var high = "0b"+bin.substring(0,16)
      var low = "0b"+bin.substring(16,32)

      type = "long"
      registers = [high,low]
      break

    case "slong":
      if (!/(^[+-]?\d+$)|(^-?0b[10]+$)|(^-?0x[0-9a-fA-F]+$)/.test(args["value"])) {
        throw new CompError("Invalid input for type 'sint'")
      }

      var negative = false
      if (args["value"].startsWith("-")) {
        args["value"] = args["value"].substring(1)
        negative = true
      }

      var dec_val = parse_int(args["value"])

      if (dec_val == 0) {
        negative = false
      }

      if (dec_val > 2147483647) {
        throw new CompError("Signed integer out of range (sign ± 2^31 bits max)")
      }

      var bin = 0

      if (negative) {
        bin = (0xffffffff - dec_val + 1).toString(2)
      } else {
        bin = dec_val.toString(2)
      }

      bin = pad(bin,32)
      var high = "0b"+bin.substring(0,16)
      var low = "0b"+bin.substring(16,32)

      registers = [high,low]
      type = "slong"
      break

    case "float":
      throw new CompError("Type 'float' not implemented")
      type = "float"
      break

    case "str":
      if (args["value"][0] != "\"" || args["value"][args["value"].length-1] != "\"") {
        throw new CompError("Strings must be quoted")
      }
      var string = args["value"].slice(1,-1)

      var id = gen_id("str")
      id = "str_" + id

      consts.push(id+":")

      for (var i = 0; i < string.length; i++) {
        var char = string[i]
        var code = char.charCodeAt(0)
        if (code < 32 || code > 127) {
          throw new CompError("Error looking up character code for '"+char+"' ")
        }
        consts.push(code)
      }

      consts.push(0) //string terminator

      registers = [id]
      type = "str"
      break

    case "bracket":
      var expression = args["expr"]
      type = translate(expression,ctx_type)[2]
      var prefix_and_value = translate(expression, ctx_type)
      var size = prefix_and_value[1].length

      //evaluate expresssion
      prefix = prefix_and_value[0]
      registers = []

      var temp_memory = alloc_block(size)
      var memory_copy = temp_memory.slice()

      //copy its results into a temp bit of memory

      for (var i = 0; i < size; i++) {
        var address = "ram." + memory_copy.shift()
        prefix.push("write " + prefix_and_value[1][i] + " " + address)
        registers.push("["+address+"]")
      }

      break

                                        //arithmetic operations
    case "+":   //add
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")
      types = [translate(args["expr1"],ctx_type)[2],translate(args["expr2"],ctx_type)[2]]
      if (types[0] != types[1]) {
        throw new CompError("Addition operator expected '"+ ctx_type +"', got '"+types[0]+"' & '"+types[1]+"'")
      }
      switch (ctx_type) {
        case "int":
        case "sint":
          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          registers = ["[alu.+]"]
          break

        case "long":
          load_lib("sys.long_add")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_add","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token, ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_add")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_add","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token, ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }
      break

    case "-":   //subtract
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")
      types = [translate(args["expr1"],ctx_type)[2],translate(args["expr2"],ctx_type)[2]]
      if (types[0] != types[1]) {
        throw new CompError("Subtraction opertor expected '"+ ctx_type +"', got '"+types[0]+"' & '"+types[1]+"'")
      }
      switch (ctx_type) {
        case "sint":
        case "int":
          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          registers = ["[alu.-]"]
          break

        case "long":
          load_lib("sys.long_subtract")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_subtract","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token, ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_subtract")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_subtract","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token, ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }
      break

    case "*":   //multiply
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")
      types = [translate(args["expr1"],ctx_type)[2],translate(args["expr2"],ctx_type)[2]]
      if (types[0] != types[1]) {
        throw new CompError("Multiplication operator expected '"+ ctx_type +"', got '"+types[0]+"' & '"+types[1]+"'")
      }
      switch (ctx_type) {
        case "int":
          load_lib("sys.int_multiply")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.int_multiply","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "sint":
          load_lib("sys.sint_multiply")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.sint_multiply","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token,ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "long":
          load_lib("sys.long_multiply")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_multiply","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token,ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_multiply")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_multiply","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token,ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }
      break

    case "/":   //divide
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")
      types = [translate(args["expr1"],ctx_type)[2],translate(args["expr2"],ctx_type)[2]]
      if (types[0] != types[1]) {
        throw new CompError("Division operator expected '"+ ctx_type +"', got '"+types[0]+"' & '"+types[1]+"'")
      }
      switch (ctx_type) {
        case "int":
          load_lib("sys.int_divide")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.int_divide","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "sint":
          load_lib("sys.int_divide")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.sint_divide","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "long":
          load_lib("sys.long_divide")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_divide","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_divide")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_divide","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token,ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }
      break

    case "^":   //exponent
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")
      types = [translate(args["expr1"],ctx_type)[2],translate(args["expr2"],ctx_type)[2]]
      if (types[0] != types[1]) {
        throw new CompError("Exponention operator expected '"+ ctx_type +"', got '"+types[0]+"' & '"+types[1]+"'")
      }
      switch (ctx_type) {
        case "int":
          load_lib("sys.int_exponent")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.int_exponent","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "sint":
          load_lib("sys.sint_exponent")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.sint_exponent","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "long":
          load_lib("sys.long_exponent")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_exponent","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_exponent")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_exponent","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token,ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }
      break

    case "%":   //modulo
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")
      types = [translate(args["expr1"],ctx_type)[2],translate(args["expr2"],ctx_type)[2]]
      if (types[0] != types[1]) {
        throw new CompError("Modulo operator expected '"+ ctx_type +"', got '"+types[0]+"' & '"+types[1]+"'")
      }
      switch (ctx_type) {
        case "int":
          load_lib("sys.int_modulo")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.int_modulo","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "sint":
          load_lib("sys.sint_modulo")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.sint_modulo","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "long":
          load_lib("sys.long_modulo")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_modulo","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_modulo")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_modulo","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token,ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }
      break
                                          //comparison expressions
    case ">":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      ctx_type = find_type_priority(args["expr1"],args["expr2"])
      switch (ctx_type) {
        case "int":
          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          registers = ["[alu.>]"]
          break

        case "sint": //acts like >= currently
          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          var temp_var = get_temp_word()
          prefix.push("write [alu.-] " + temp_var[1])
          prefix.push("write [" + temp_var[1] + "] alu.1")
          prefix.push("write 1 alu.2")
          prefix.push("write [alu.-] " + temp_var[1])
          prefix.push("write [" + temp_var[1] + "] alu.1")
          prefix.push("write 0b1000000000000000 alu.2")
          registers = ["[alu.<]"]
          free_block([temp_var[0]])
          break

        case "long":
          load_lib("sys.long_greater")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_greater","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_greater")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_greater","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }
      type = "bool"
      break

    case "<":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      ctx_type = find_type_priority(args["expr1"],args["expr2"])
      switch (ctx_type) {
        case "int":
          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          registers = ["[alu.<]"]
          break

        case "sint": //acts like <= currently
          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          var temp_var = get_temp_word()
          prefix.push("write [alu.-] " + temp_var[1])
          prefix.push("write [" + temp_var[1] + "] alu.1")
          prefix.push("write 1 alu.2")
          prefix.push("write [alu.+] " + temp_var[1])
          prefix.push("write [" + temp_var[1] + "] alu.1")
          prefix.push("write 0b0111111111111111 alu.2")
          registers = ["[alu.>]"]
          free_block([temp_var[0]])
          break

        case "long":
          load_lib("sys.long_less")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_less","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_less")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_less","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }
      type = "bool"
      break

    case ">=":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      ctx_type = find_type_priority(args["expr1"],args["expr2"])
      switch (ctx_type) {
        case "int":
          var temp_vars = [get_temp_word(),get_temp_word()]

          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          prefix.push("write [alu.=] "+temp_vars[0][1])
          prefix.push("write [alu.>] "+temp_vars[1][1])
          prefix.push("write ["+temp_vars[0][1]+"] alu.1")
          prefix.push("write ["+temp_vars[1][1]+"] alu.2")
          registers = ["[alu.|]"]

          free_block(temp_vars[0][0])
          free_block(temp_vars[1][0])
          break

        case "sint":
          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          var temp_var = get_temp_word()
          prefix.push("write [alu.-] " + temp_var[1])
          prefix.push("write [" + temp_var[1] + "] alu.1")
          prefix.push("write 0b1000000000000000 alu.2")
          registers = ["[alu.<]"]
          free_block([temp_var[0]])
          break

        case "long":
          load_lib("sys.long_greater")
          load_lib("sys.long_equal")

          var temp_vars = [get_temp_word(),get_temp_word()]

          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_greater","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]

          prefix.push("write "+prefix_and_value[1][0]+" "+temp_vars[0][1])

          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_equal","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix.push.apply(prefix,prefix_and_value[0])
          prefix.push("write "+prefix_and_value[1][0]+" "+temp_vars[1][1])

          prefix.push("write ["+temp_vars[0][1]+"] alu.1")
          prefix.push("write ["+temp_vars[1][1]+"] alu.2")
          registers = ["[alu.|]"]

          free_block(temp_vars[0][0])
          free_block(temp_vars[1][0])
          break

        case "slong":
          load_lib("sys.slong_greater")
          load_lib("sys.slong_equal")

          var temp_vars = [get_temp_word(),get_temp_word()]

          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_greater","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]

          prefix.push("write "+prefix_and_value[1][0]+" "+temp_vars[0][1])

          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_equal","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix.push.apply(prefix,prefix_and_value[0])
          prefix.push("write "+prefix_and_value[1][0]+" "+temp_vars[1][1])

          prefix.push("write ["+temp_vars[0][1]+"] alu.1")
          prefix.push("write ["+temp_vars[1][1]+"] alu.2")
          registers = ["[alu.|]"]

          free_block(temp_vars[0][0])
          free_block(temp_vars[1][0])
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }

      type = "bool"
      break

    case "<=":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      ctx_type = find_type_priority(args["expr1"],args["expr2"])
      switch (ctx_type) {
        case "int":
          var temp_vars = [get_temp_word(),get_temp_word()]

          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          prefix.push("write [alu.=] "+temp_vars[0][1])
          prefix.push("write [alu.<] "+temp_vars[1][1])
          prefix.push("write ["+temp_vars[0][1]+"] alu.1")
          prefix.push("write ["+temp_vars[1][1]+"] alu.2")
          registers = ["[alu.|]"]

          free_block(temp_vars[0][0])
          free_block(temp_vars[1][0])
          break

        case "sint":
          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          var temp_var = get_temp_word()
          prefix.push("write [alu.-] " + temp_var[1])
          prefix.push("write [" + temp_var[1] + "] alu.1")
          prefix.push("write 0b0111111111111111 alu.2")
          registers = ["[alu.>]"]
          free_block([temp_var[0]])
          break

        case "long":
          load_lib("sys.long_less")
          load_lib("sys.long_equal")

          var temp_vars = [get_temp_word(),get_temp_word()]

          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_less","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]

          prefix.push("write "+prefix_and_value[1][0]+" "+temp_vars[0][1])

          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_equal","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix.push.apply(prefix,prefix_and_value[0])
          prefix.push("write "+prefix_and_value[1][0]+" "+temp_vars[1][1])

          prefix.push("write ["+temp_vars[0][1]+"] alu.1")
          prefix.push("write ["+temp_vars[1][1]+"] alu.2")
          registers = ["[alu.|]"]

          free_block(temp_vars[0][0])
          free_block(temp_vars[1][0])
          break

        case "slong":
          load_lib("sys.slong_less")
          load_lib("sys.slong_equal")

          var temp_vars = [get_temp_word(),get_temp_word()]

          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_less","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]

          prefix.push("write "+prefix_and_value[1][0]+" "+temp_vars[0][1])

          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_equal","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix.push.apply(prefix,prefix_and_value[0])
          prefix.push("write "+prefix_and_value[1][0]+" "+temp_vars[1][1])

          prefix.push("write ["+temp_vars[0][1]+"] alu.1")
          prefix.push("write ["+temp_vars[1][1]+"] alu.2")
          registers = ["[alu.|]"]

          free_block(temp_vars[0][0])
          free_block(temp_vars[1][0])
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }

      type = "bool"
      break

    case "==":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      ctx_type = find_type_priority(args["expr1"],args["expr2"])
      switch (ctx_type) {
        case "bool":
        case "int":
        case "sint":
          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          registers = ["[alu.=]"]
          break

        case "long":
          load_lib("sys.long_equal")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_equal","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_equal")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_equal","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token, ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }

      type = "bool"
      break

    case "!=":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      ctx_type = find_type_priority(args["expr1"],args["expr2"])
      log.debug("ctx_type: " + ctx_type)
      switch (ctx_type) {
        case "bool":
        case "int":
        case "sint":
          prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
          prefix.push("write [alu.=] ctl.cnd")
          prefix.push("write [ctl.cnd] alu.1")
          registers = ["[alu.!]"]
          break

        case "long":
          load_lib("sys.long_not_equal")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_not_equal","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_not_equal")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_not_equal","exprs":[args["expr1"],args["expr2"]]}}
          var prefix_and_value = translate(token, ctx_type)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }

      type = "bool"
      break
                                    //bit-wise operations, only needs to test word length
    case "&":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")
      types = [translate(args["expr1"])[2],translate(args["expr2"])[2]]

      prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
      registers = ["[alu.&]"]
      break

    case "|":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")
      types = [translate(args["expr1"])[2],translate(args["expr2"])[2]]

      prefix = write_operands(args["expr1"],args["expr2"],ctx_type)
      registers = ["[alu.|]"]
      break

    case ">>":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      switch (ctx_type) {
        case "bool":
        case "int":
          prefix = write_operand(args["expr"],ctx_type)
          registers = ["[alu.>>]"]
          break

        case "sint":
          load_lib("sys.sint_rshift")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.sint_rshift","exprs":[args["expr"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "long":
          load_lib("sys.long_rshift")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_rshift","exprs":[args["expr"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_rshift")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_rshift","exprs":[args["expr"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }
      break

    case "<<":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      switch (ctx_type) {
        case "bool":
        case "int":
        case "sint":
            prefix = write_operand(args["expr"],ctx_type)
            registers = ["[alu.<<]"]
          break

        case "long":
          load_lib("sys.long_lshift")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.long_lshift","exprs":[args["expr"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        case "slong":
          load_lib("sys.slong_lshift")
          var token = {"name":"function","type":"expression","arguments":{"name":"sys.slong_lshift","exprs":[args["expr"]]}}
          var prefix_and_value = translate(token)
          prefix = prefix_and_value[0]
          registers = prefix_and_value[1]
          break

        default:
          throw new CompError("Unsupported datatype '"+ctx_type+"' for operation " + token["name"])
          break
      }
      break

    case "!":   //(not)
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      prefix = write_operand(args["expr"],ctx_type)
      registers = ["[alu.!]"]
      break

    case "..":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      var expr1 = translate(args["expr1"],ctx_type)
      var expr1_prefix = expr1[0]
      var expr1_reg = expr1[1]
      prefix = expr1_prefix
      var expr2 = translate(args["expr2"],ctx_type)
      var expr2_prefix = expr2[0]
      var expr2_reg = expr2[1]
      prefix.push.apply(prefix,expr2_prefix)
      registers = expr1_reg
      registers.push.apply(registers,expr2_reg)
      break

    case ":": //word selector
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      var expr = translate(args["expr1"],ctx_type)
      prefix = expr[0]
      var expr_regs = expr[1]

      var index = translate(args["expr2"],"int")
      if (index[2] != "int") {
        throw new CompError("Word selector index must be of type 'int'") //should also be static (ie. number token)
      }
      if (index[1][0] >= expr_regs.length) {
        throw new CompError("Index out of range")
      }

      registers = [expr_regs[index[1][0]]]
      break
                                  //others
    case "is_odd":
      log.debug("op: "+token["name"]+" , targ: '" + ctx_type + "'")

      var prefix_and_value = translate(args["expr"],"int")
      prefix = prefix_and_value[0]
      registers = prefix_and_value[1]
      //~ if (prefix_and_value[2] != "int") {
        //~ throw new CompError("not supported unless int")
      //~ }
      registers = [registers[registers.length - 1]]
      break

    case "overflow":
      registers = ["[alu.ov]"]
      break

    case "expr_array":
      var id = gen_id("expr_array")
      id = "expr_array_" + id

      var given_type_size = args["type_size"]
      var length = args["exprs"].length

      //if no context given use 1st element to determine type
      //and assume current length is max length
      if (ctx_type === undefined) {
        var contained_type = args["exprs"][0]["arguments"]["type_guess"]
      } else {
        var contained_type = ctx_type
        log.info("context given type is "+ contained_type)
      }
      var max_length = length

      //but explicitly given type and max length will override these
      if (given_type_size !== undefined) {
        if (given_type_size.length == 1) {
          contained_type = given_type_size[0]
        } else if (given_type_size.length == 2) {
          contained_type = given_type_size[0]
          max_length = parseInt(given_type_size[1])
        }
      }

      if (ctx_type === undefined && given_type_size === undefined) {
        log.warn("Inferring type as '"+ contained_type +"' from first element of array.")
      }

      name_type_map[scope][id] = contained_type
      var item_size = translate(args["exprs"][0],contained_type)[1].length

      var consts_to_add = []
      consts_to_add.push(id + ":")

      for (var item of args["exprs"]) {
        var prefix_and_value = translate(item,contained_type)
        if (prefix_and_value[0].length != 0 ) {
          throw new CompError("Expressions in an array decleration must be static")
        }
        consts_to_add.push.apply(consts_to_add, prefix_and_value[1])
      }
      consts.push.apply(consts,consts_to_add)

      registers = [id,max_length,item_size,length]
      type = "expr_array"
      break

    case "var_or_const":
      if (args["name"] in libs) {
        load_lib(args["name"] )
      }

      if (args["name"] in var_map[scope]) {
        registers = []
        for (var addr of var_map[scope][args["name"]]) {
          registers.push("[ram."+addr+"]")
        }
      } else if (args["name"] in const_map) {
        registers = []
        for (var addr of const_map[args["name"]]) {
          registers.push("[" + addr + "]")
        }
      } else if (args["name"] in var_map["[global]"]) {
        registers = []
        for (var addr of var_map["[global]"][args["name"]]) {
          registers.push("[ram^."+addr+"]")
        }

      } else {
        throw new CompError("'"+args["name"]+"' is undefined")
      }

      type = name_type_map[scope][args["name"]]
      if (typeof type === "undefined") {
        type = name_type_map["[global]"][args["name"]]
      }
      if (typeof type === "undefined") {
        throw new CompError("Can't lookup type of '" + args["name"] + "'")
      }
      break

    case "array_expression":
      var array_name = args["name"]
      var operation = args["operation"]

      var scope_name
      var ram_prefix
      if (array_name in var_map[scope]) {
        // this is a local array
        scope_name = scope
        ram_prefix = "ram."
      } else if (array_name in var_map["[global]"]) {
        // this is a global array
        scope_name = "[global]"
        ram_prefix = "ram^."
      } else {
        throw new CompError("Cannot find array named '" + array_name + "'")
      }

      var array_information = var_map[scope_name][array_name]
      var type = name_type_map[scope_name][array_name+".contained_type"]
      var item_size_as_number = name_type_map[scope_name][array_name+".contained_size"]

      if (operation == "index") {
        var index = args["expr"]
        var prefix_value_type = translate(index,"int")
        if (prefix_value_type[2] != "int") {
          throw new CompError("Array indexes must be of type 'int'")
        }
        prefix.push.apply(prefix,prefix_value_type[0])

        var index = prefix_value_type[1]
        var base_addr = "["+ram_prefix+array_information[0]+"]"
        var item_size_as_register = "["+ram_prefix+array_information[2]+"]"

        //calculate address of item at the specified index
        load_lib("sys.array_pointer")
        prefix.push("write "+index+" ram+.0")
        prefix.push("write "+item_size_as_register+" ram+.1")
        prefix.push("write "+base_addr+" ram+.2")
        prefix.push("call func_sys.array_pointer_base_addr") //output is in ram+.3

        var memory = alloc_block(item_size_as_number)

        //copy item from calculated address to allocated result registers
        prefix.push("write [ram+.3] ram+.0")
        prefix.push("write ram."+ memory[0] +" ram+.1")
        prefix.push("write "+item_size_as_register+ " ram+.2")

        // if this is a global array we need a different copy function
        if (scope_name === "[global]") {
          load_lib("sys.global_ram_to_ram_copy")
          prefix.push("call func_sys.global_ram_to_ram_copy_length")
        } else {
          load_lib("sys.ram_to_ram_copy")
          prefix.push("call func_sys.ram_to_ram_copy_length")
        }

        registers = []
        for (var word of memory) {
          registers.push("[ram."+word+"]")
        }

      } else if (operation == "len") {
        var value = "["+ram_prefix+array_information[3]+"]"
        registers = [value]
        type = "int"

       } else if (operation == "max_len") {
        var value = "["+ram_prefix+array_information[1]+"]"
        registers = [value]
        type = "int"

      } else if (operation == "pop") {
        // simply take one away from the length of the array, then return the item at that index

        var array_length_register = ram_prefix+array_information[3]+""

        prefix.push("copy "+ array_length_register +" alu.1")
        prefix.push("write 1 alu.2")
        prefix.push("write [alu.-] "+ array_length_register)

        var index = "["+array_length_register+"]"
        var base_addr = "["+ram_prefix+array_information[0]+"]"
        var item_size_as_register = "["+ram_prefix+array_information[2]+"]"

        //calculate address of item at the specified index
        load_lib("sys.array_pointer")
        prefix.push("write "+index+" ram+.0")
        prefix.push("write "+item_size_as_register+" ram+.1")
        prefix.push("write "+base_addr+" ram+.2")
        prefix.push("call func_sys.array_pointer_base_addr") //output is in ram+.3

        var memory = alloc_block(item_size_as_number)

        //copy item from calculated address to allocated result registers
        load_lib("sys.ram_to_ram_copy")
        prefix.push("write [ram+.3] ram+.0")
        prefix.push("write ram."+ memory[0] +" ram+.1")
        prefix.push("write "+item_size_as_register+ " ram+.2")
        prefix.push("call func_sys.ram_to_ram_copy_length")

        registers = []
        for (var word of memory) {
          registers.push("[ram."+word+"]")
        }

      } else {
        throw new CompError("not implemented")
      }
      break

    case "function":      // function call
      // functions begining with 'sys.' will need to be loaded from the standard library first
      if (args["name"].startsWith("sys.")) {
        load_lib(args["name"])
      }

      var label = "func_" + args["name"]
      if (!(args["name"] in var_map)) {
        throw new CompError("'"+args["name"]+"' is undefined")
      }
      var target_arg_no = Object.keys(arg_map[args.name]).length
      var actual_arg_no = Object.keys(args["exprs"]).length
      var target_args = arg_map[args["name"]]

      if (actual_arg_no > target_arg_no) {
        throw new CompError("'" + args["name"] + "' takes at most " + target_arg_no + " arg(s)")
      }
      log.debug("call '" + args["name"] + "' " + actual_arg_no + "/" + target_arg_no + " arg(s)")

      for (var i = 0; i < actual_arg_no; i++) {
        var target_type = name_type_map[args["name"]][Object.keys(target_args)[i]]
        var target_regs = var_map[args["name"]][Object.keys(target_args)[i]]
        var token = args["exprs"][i]

        var prefix_value_type = translate(token,target_type)
        if (prefix_value_type[2] != target_type) {
          throw new CompError("In call to "+ args["name"] +"()\nArg '" + Object.keys(target_args)[i] + "' requires '" + target_type+ "', got '"+ prefix_value_type[2] +"'")
        }

        prefix.push.apply(prefix,prefix_value_type[0])
        for (var y = 0; y < target_regs.length; y++) {
          var expr_reg = prefix_value_type[1][y]
          var dst_reg = "ram+." + target_regs[y]
          prefix.push("write " + expr_reg + " " + dst_reg)
        }
      }

      if (actual_arg_no != 0) {
        log.debug(args["name"] + ": skip def of " + Object.keys(target_args)[actual_arg_no-1])
        label += "_" + Object.keys(target_args)[actual_arg_no-1]
      }

      prefix.push("call " + label)

      registers = return_map[args["name"]]
      type = name_type_map[args["name"]][args["name"]]

      if (type.startsWith('[') && type.endsWith(']')) {
        // trim type to exclude square brackets if present
        type = type.slice(1,-1)
      }
      break

    case "pointer_lookup":
      var var_or_const_name = args["var_or_const_name"]
      var address_expr = tokenise(var_or_const_name)
      var prefix_value_type = translate(address_expr,"int")
      if (prefix_value_type[2] != "int") {
        throw new CompError("Pointers must be of type int, got '" + prefix_value_type[2] +"'")
      }

      if (args["type_cast"] !== undefined) {
        type = args["type_cast"]
      } else if (ctx_type !== undefined) {
        type = ctx_type
      } else {
        log.warn("No explicit cast or context-given type for pointer lookup, defaulting to 'int'")
        type = "int"
      }

      var size = data_type_size[type]
      var temp_buffer = alloc_block(size)

      // make pointer value available
      prefix.push.apply(prefix,prefix_value_type[0])

      // copy pointer value into temp ram word
      var pointer_addr = get_temp_word()
      prefix.push("write " + prefix_value_type[1] + " " + pointer_addr[1])

      // lookup pointer value and copy into temp buffer
      prefix.push("copy [" + pointer_addr[1] + "] ram." + temp_buffer[0])

      // if the target type is more than one word, copy more words
      if (size > 1) {
        prefix.push("copy " + pointer_addr[1] + " alu.1")

        for (var i = 1; i < size; i++) {
          prefix.push("write " + i + " alu.2")
          prefix.push("copy [alu.+] ram." + temp_buffer[i])
        }
      }

      // output refisters are the values of the temp buffer
      registers = []
      for (var addr of temp_buffer) {
        registers.push("[ram." + addr + "]")
      }
      break

    default:
      throw new CompError("Error translating expression:\nUnknown type '" + token["name"] + "'")
      break
    }
    return [prefix, registers, type]

  } else if (token["type"] == "structure") {
    var result = []
    switch (token["name"]) {

    case "if":
      var label = "if_" + gen_id("if")

      var else_present = false
      var else_if_present = false
      var exprs = [args["expr"]]
      var main_tokens = [[]]
      var else_tokens = []
      var clause_number = 0
      var target = main_tokens[0]

      for (var item of token["body"]) {
        if (item["name"] == "else if") {
          clause_number++
          main_tokens.push([])
          exprs.push(item["arguments"]["expr"])
          target = main_tokens[clause_number]
          else_if_present = true
        } else if (item["name"] == "else") {
          if (else_present) {
            throw new CompError("More than one else statement")
          }
          else_present = true
          target = else_tokens
        } else {
          target.push(item)
        }
      }

      for (var i = 0; i < exprs.length; i++) {
        if (i != 0) {
          result.push(label+"_"+i+":")
        }

        if (exprs.length == (i+1) && !else_present) {
          var next_case_label = label+"_end"
        } else {
          var next_case_label = label+"_"+(i+1)
        }

        var prefix_and_value = translate(exprs[i],"bool")
        var prefix = prefix_and_value[0]
        var value = prefix_and_value[1]
        if (prefix_and_value[2] != "bool") {
          log.warn("Structure expession expected type 'bool', got '"+ prefix_and_value[2] +"'")
        }
        result.push.apply(result,prefix)
        result.push("write " + value[0] + " ctl.cnd")
        result.push("goto? " + next_case_label)

        result.push.apply(result,translate_body(main_tokens[i]))

        if ((else_present || else_if_present) && i != exprs.length) {
          result.push("goto " + label+"_end")
        }
      }

      if (else_present) {
        result.push(label+"_"+exprs.length+":")
      }
      result.push.apply(result,translate_body(else_tokens))
      result.push(label+"_end:")
      break

    case "else":
      throw new CompError("Can't evaluate 'else' flag")
      break

    case "else if":
      throw new CompError("Can't evaluate 'else if' flag")
      break

    case "for":
      var label = "for_" + gen_id("for")
      var init_result = translate(args["init"])
      result.push.apply(result,init_result)

      var expr_prefix_and_value = translate(args["expr"],"bool")
      var expr_prefix = expr_prefix_and_value[0]
      var expr_value = expr_prefix_and_value[1][0]
      if (expr_prefix_and_value[2] != "bool") {
        log.warn("Structure: expected type 'bool', got '"+ expr_prefix_and_value[2] +"'")
      }
      result.push.apply(result,expr_prefix)
      result.push("write " + expr_value + " ctl.cnd")
      result.push("goto? " + label + "_end")
      result.push([(label+"_start:")])

      result.push.apply(result,translate_body(token["body"]))

      var cmd_result = translate(args["cmd"])
      result.push.apply(result,cmd_result)

      result.push.apply(result,expr_prefix)
      result.push("write " + expr_value + " ctl.cnd")
      result.push("goto? " + label + "_end")
      result.push("goto " + label + "_start")
      result.push(label+"_end:")
      break

    case "while":
      var label = "while_" + gen_id("while")

      var prefix_and_value = translate(args["expr"],"bool")
      var prefix = prefix_and_value[0]
      var value = prefix_and_value[1][0]
      if (prefix_and_value[2] != "bool") {
        log.warn("Structure: expected type 'bool', got '"+ prefix_and_value[2] +"'")
      }
      result.push.apply(result,prefix)
      result.push("write " + value + " ctl.cnd")
      result.push("goto? " + label + "_end")
      result.push([(label+"_start:")])

      result.push.apply(result,translate_body(token["body"]))

      result.push.apply(result,prefix)
      result.push("write " + value + " ctl.cnd")
      result.push("goto? " + label + "_end")
      result.push("goto " + label + "_start")
      result.push(label+"_end:")
      break

    case "function_def":
      if (!const_name_available(args["name"])) {
        throw new CompError("Name '"+args["name"]+"' is not available")
      }
      func[args["name"]] = []
      target = func[args["name"]]
      var label = "func_" + args["name"]
      target.push(label+":")
      var old_scope = scope
      scope = args["name"]
      var_map[scope] = {}
      arg_map[scope] = {}
      name_type_map[scope] = {}
      free_ram[scope] = gen_free_ram_map()

      if (args["type"] === undefined) {
        name_type_map[scope][scope] = "none"
      } else {
        name_type_map[scope][scope] = args["type"]
      }
      log.debug("namespace -> " + scope)

      target.push.apply(target,translate_body(token["body"]))

      scope = old_scope
      log.debug("namespace -> " + scope)
      if (target[target.length -1] != "return") {
        target.push("return")
      }
      break

    default:
      throw new CompError("Error translating structure:\nUnknown type '" + token["name"] + "'")
      break
    }
    return result
  } else {
    throw new CompError("Error translating token:\nUnknown type '"+ token["type"] + "'")
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
    var t0 = performance.now()
    var tokens = []
    var prev_type = ""
    var prev_indent = 0
    var curr_indent = 0
    var token = {}
    var targ = [tokens]
    var expect_indent = false
    var include_block_mode = false
    for (var i = 0; i < input.length; i++) {
      var line = input[i].trim()   // remove any trailing whitesapce
      if (line == "" || line == "\n") { continue } // if it is a newline, skip it
      if (line == "///") {
        include_block_mode = ! include_block_mode
        continue
      }
      if (include_block_mode) {
        consts.push(line)
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
        log.debug("indent ↑ " + prev_indent + " -> " + curr_indent)
        expect_indent = false  //we've got an indent so no need to throw an error
      } else if (curr_indent < prev_indent) {
        log.debug("indent ↓ " + prev_indent + " -> " + curr_indent)
        if (line.trim().startsWith("else")) {
          for (var j = 0; j < (prev_indent - curr_indent)-1; j++) {
            targ.pop()
          }
          log.debug("same target [if statement extension]")
          expect_indent = true
        } else {
          for (var j = 0; j < (prev_indent - curr_indent); j++) {
            targ.pop()             //set 'target' token to the previous one in the stack
          }
          if (targ[targ.length-1] instanceof Array) {
            log.debug("new target ↓ [root]")
          } else {
            log.debug("new target ↓ " + targ[targ.length-1]["name"])
          }
        }
      }  // if no indnet, carry on passing into current target

      try {
        token = tokenise(line, i+1)
        if (targ[targ.length-1] instanceof Array) { //if the target is an array it is the root 'tokens' list
          targ[targ.length-1].push(token)
        } else {                                    //else it is a structure
          targ[targ.length-1]["body"].push(token)
        }

        if (token["type"] == "structure" && !(token["name"] in {"else":"","else if":""})) {     //when a structure header is parsed, set it to be target and expect indent
          log.debug("new target ↑ " + token["name"])
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

    var t1 = performance.now()

    log.info("↳ success, "+ input.length + " line(s) in "+  Math.round(t1-t0) + "ms")

  if (!nested) {
    token_dump = tokens
  }

  //translate
    log.info("Tranlsating...")
    var t0 = performance.now()
    var output = ""
    var command = []
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i]["type"] == "expression" && tokens[i]["name"] != "function") {
        throw new CompError("Unexpected expression", tokens[i].line)
      }

      try {
        command = translate(tokens[i])
        if (tokens[i]["name"] == "function") {
          command = command[0] // if it is a function call (which are expressions) take only the prefix and bin the result register [[tokens],result] -> [tokens]
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

    var t1 = performance.now()
    log.info("↳ success, "+ tokens.length +" token(s) in "+  Math.round(t1-t0) + "ms")

  //add consts
    for (var i = 0; i < consts.length; i++) {
      output += "\n" + consts[i]
    }

  //add function defs
    for (var item in func) {
      for (var line of func[item]) {
        output += "\n" + line
      }
    }

    output += "\n"

  //feedback

  if (!nested) {
    var var_number = 0
    for (var namespace in var_map) {
      if (namespace.startsWith("sys.")) { continue }
      var_number += Object.keys(var_map[namespace]).length
    }
    for (var namespace in arg_map) {
      if (namespace.startsWith("sys.")) { continue }
      var_number -= Object.keys(arg_map[namespace]).length
    }

    var ram_percent = Math.round((max_allocated_ram_slots / 1023) * 100)
    var standard_libs_used = Object.keys(required).length

    if (var_number > 0) {
      log.warn(var_number + " variable(s) are never deallocated")
    }

    let ram_message = "RAM use: " + ram_percent + "% (" + max_allocated_ram_slots + "/1023 words)"

    if (typeof process === 'undefined') { // if we are running in a browser not nodejs
      ram_message += "<progress value="+max_allocated_ram_slots+" max=\"1023\" class=\"ram-bar\"></progress>"
    }
    log.info(ram_message)
    log.info("Standard library functions used: " + standard_libs_used)
  }

  return output
}

log.info("Compiler thread started, " + Object.keys(libs).length + " standard functions loaded")
