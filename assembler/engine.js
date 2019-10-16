let debug = false

onmessage = (event) => {
  let message = event.data
  switch(message[0]) {
    case "assemble":
      let result = ""
      try {
        let as_array = message[1].split("\n")
        result = assemble(as_array)
      } catch (error) {
        if (error instanceof AsmError) {
          log.error(error.toString())
        } else {
          throw error
        }
      } finally {
        postMessage(['result',result])
      }
      break
    case "debug":
      debug = message[1]
      break
  }
}

function AsmError(message, location) {
  this.message = message
  this.location = location
}

AsmError.prototype.toString = function() {
  return `${this.location}:\n${this.message}`
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

const opDefs = {
  "stop":0,
  "return":1,
  "goto":2,
  "call":3,
  "write":4,
  "copy":5
}

const defs = {
  "alu.1" : 2048,
  "alu.2" : 2049,
  "alu.+" : 2050,
  "alu.-" : 2051,
  "alu.>>" : 2052,
  "alu.<<" : 2053,
  "alu.&" : 2054,
  "alu.|" : 2055,
  "alu.!" : 2056,
  "alu.>" : 2057,
  "alu.<" : 2058,
  "alu.=" : 2059,
  "alu.ov" : 2060,
  "usrio.inp1" : 4096,
  "usrio.inp2" : 4097,
  "usrio.inp3" : 4098,
  "usrio.out1" : 4099,
  "usrio.out2" : 4100,
  "usrio.out3" : 4101,
  "kbd.pop": 8192,
  "kbd.len": 8193,
  "ctl.cnd" : 1,
  "ctl.addrmode" : 2,
  "ctl.framenum" : 4,
  "ctl.lowtimer" : 8,
  "ctl.hightimer" : 16
}

function regToCode(id) {
  if (id.toLowerCase().startsWith("ram-.")) { //it's a ram address (lower)
    var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
    if ( number >= 0 && number <= 1023) {
      return number+16384//it's valid
    } else {
      return false
    }
  } else if (id.toLowerCase().startsWith("ram.")) { //it's a ram address (current)
    var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
    if ( number >= 0 && number <= 1023) {
      return number+20480//it's valid
    } else {
      return false
    }
  } else if (id.toLowerCase().startsWith("ram+.")) { //it's a ram address (upper)
    var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
    if ( number >= 0 && number <= 1023) {
      return number+24576//it's valid
    } else {
      return false
    }
  } else if (id.toLowerCase().startsWith("ram#.")) { //it's a direct ram address
    var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
    if ( number >= 0 && number < 16384) {
      return number+16384//it's valid
    } else {
      return false
    }
  } else if (id.toLowerCase().startsWith("ram^.")) { //it's a direct ram (top frame)
    var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
    if ( number >= 0 && number < 16384) {
      return number+28672//it's valid
    } else {
      return false
    }
  } else if (id.toLowerCase().startsWith("rom.")) { //it's rom
    var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
    if ( number >= 0 && number <= 32767) {
      return number + 32768 //it's valid
    } else {
      return false
    }
  } else if (id.toLowerCase().startsWith("vram.")) { //it's vram
    var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
    if ( number >= 0 && number <= 1023) {
      return number + 6144 //it's valid
    } else {
      return false
    }
  } else {
    if (id.toLowerCase() in defs) {
      return defs[id.toLowerCase()]
    } else {
      return false
    }
  }
}

function opToCode(id) {
  if (id.toLowerCase() in opDefs) {
    return opDefs[id.toLowerCase()]
  } else {
    return false
  }
}

function pad(num) {
  return ("0000000000000000" + num).slice(-16)
}

function isSquareBracktes(str) {
  var matches = str.match(/\[(.*?)\]/)
  if (matches) {
    return matches[1]
  } else {
    return false
  }
}

function numToBin(num) {
  if (num.startsWith("0b")) { //it's already in binary
    return pad(num.substring(2))
  } else if (num.startsWith("0x")) { //it's in hexadeciamal
    var dec = parseInt(num.substring(2),16)
    return pad(dec.toString(2))
  } else {  //it's in decimal
    var dec = parseInt(num,10)
    return pad(dec.toString(2))
  }
}

function assemble(lines) {
  var assembled = []
  var adr = 0
  var labels = {}

  log.info("1st Pass...")
  for (var i = 0; i < lines.length; i++) {
    if (lines[i] === "" ) {continue} // skip empty lines
    if (/\s*\/\//.test(lines[i])) {continue} // skip comments
    var line = lines[i].trim()
    line = line.split(" ") // turns "copy ram1" into ["copy", "ram1"]
    line.map(function(str){str.replace(/(\r|\n)/g,"")}) // strips trailing whitespace

    if (line.length === 1 && !(line[0] in opDefs)) { // if it's one string
      if (line[0].endsWith(":")) { // ends with : means it is a label
        let label = line[0].substr(0, line[0].length - 1)
        if (label in labels) {
          throw new AsmError(`Label '${label}' has already been defined`,`line ${i}`)
        }
        labels[label] = adr + 32768
        log.debug("addr 0x" +  adr.toString(16) + " new label '" + label + "'")
        continue
      } else if (line[0].match(/[a-z]/) && !line[0].startsWith("0")) { // label
        assembled[i] = line[0] + "\n"
        adr++
      } else { // if not it's just a number
        assembled[i] = numToBin(line[0]) + "\n"
        adr++
      }
    } else {
      // it's a command
      var op = line[0]
      var args = []
      var argNo = 0
      var pointerMap = ""
      var cnd = "0"

      // assemble the op code
        var decimal = opToCode(op)
        if (op.endsWith("?")) {
          cnd = "1"
          op = op.substr(0, line[0].length - 1)
        }
        if (op in opDefs) {
          op = ("000" + opToCode(op).toString(2)).slice(-3)
        } else {
          op = "---"
        }
      // assemble the args
      for (var y = 1; y < line.length; y++) {
        var item = line[y]
        if (isSquareBracktes(item) !== false) {
          var item = isSquareBracktes(item)
          pointerMap += "1"
        } else {
          pointerMap += "0"
        }

        if (regToCode(item) !== false) {  // regular reg         -if returns number (!==) prevents a zero being false
          args[y-1] = numToBin(regToCode(item).toString())
        } else if (item.match(/[a-z]/) && !item.startsWith("0")) { // label
          args[y-1] = item // dealt with on 2nd pass
        } else { // number
          args[y-1] =  numToBin(item)
        }
      }
      // compute number of args
      argNo = ("000" + args.length.toString(2)).slice(-3)
      // computer pointer map
      pointerMap = ("0000000" + pointerMap).slice(-7)
      pointerMap = pointerMap.split('').reverse().join('')
      //now assemble the whole command
      var header = op + pointerMap + "00000" + cnd
      if (args.length !== 0) {var body = "\n" + args.join("\n") } else {var body = ""}
      assembled.push( header + body + "\n" )
      adr += args.length +1
    }
  }
  log.info("↳ success, " + lines.length + " lines(s) parsed")

  var asm_string = assembled.join("") //join it all into one string

  log.info("2nd Pass...")
  for (var key in labels) {
    var bin = numToBin(labels[key].toString())
    asm_string = asm_string.replace( RegExp("\\b"+key+"\\b","gi") , bin)
  }
  log.info("↳ success, " + Object.keys(labels).length + " label(s) replaced")

  log.info("3rd Pass...")
  var as_list = asm_string.split("\n")

  for (let i = 0; i < as_list.length; i++) {
    let line = as_list[i]
    if (!   /^[0-1]{16}\n?$/.test(line) && line != "") {
      throw new AsmError(`'${line}' is not defined`,`word ${i}`)
    }
  }
  log.info("↳ success, " + (as_list.length - 1) + " word(s) checked")

  size_bytes = (as_list.length - 1) * 2;
  log.info("Output size: "+ size_bytes +" bytes")
  return asm_string
}

log.info("Assembler thread started")
