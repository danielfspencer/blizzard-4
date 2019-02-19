importScripts("../assets/fill.js");
var stepsPerMsec = 0;
var count = 0;
var running = false;
var DEBUG = false;
var total_cycles = 0

var programCounter = 0;
var exeMode = "fetch";

var keyBuffer = [];
var cnd = 0;
var rom =  ["0000000000000000"];
var alu = [];
var io = [];
var gpu_buffer = [];

var writeBus = 0;
var dataBus = 0;

var scancodes = {
    'e':36,'d':35,'6':54,'7':61,'9':70,'t':44,'z':26,'Tab':13,'8':62,'=':85,'b':50,'p':77,'s':27,'Backspace':102,'v':42,'h':51,'4':37,'Control':20,'n':49,'\\':93,'m':58,'o':68,'1':22,'u':60,'w':29,'`':14,'3':38,'g':52,'Enter':90,'-':78,'r':45,'f':43,'2':30,'i':67,'Alt':17,'l':75,'0':69,'Shift':18,' ':41,'x':34,'j':59,'5':46,'q':21,'a':28,'Escape':118,'k':66,'y':53,'c':33,"ArrowLeft":107,"ArrowRight":116,"ArrowUp":117,"ArrowDown":114
}

init();

function init() {
    initArrays();
    sendInfo();
    reportHz();
    setInterval(function() {reportHz()}, 10000);
}

function initArrays() {
    vram = Array(1024);
    cmdRegs = {word:"0000000000000000", args:[], frameNo:0,upFrame:1,downFrame:31};
    alu = Array(14).fill(0);
    io = Array(5).fill(0);
    stack = Array(32);
    vram.fill(0);
    stack.fill({});
    gpu_buffer = [];
    for (var y = 0; y < 32; y++) {
        stack[y] = Array(512).fill(0);
    }
}

function sendInfo() {
    var data = {};
    data.buffer = keyBuffer;
    data.progCount = programCounter;
    data.mode = exeMode;
    data.cmdRegs = cmdRegs;
    data.dcm = [io[2],io[3],io[4]];
    data.gpubuffer = gpu_buffer;
    gpu_buffer = [];
    postMessage(["info", data]);
}

function reportHz() {
    postMessage(["speed",count]);
    count = 0;
}

onmessage = function(msg) {
    switch(msg.data[0]) {
    case "clock":
        setClock(msg.data[1]);
        break;
    case "step":
        running = true
        frame(1);
        sendInfo();
        postMessage(["stepped"]);
        running = false
        break;
    case "start":
        if (!running) { run(); }
        break;
    case "stop":
        if (running) { stop(); }
        break;
    case "key":
        if (keyBuffer.length < 256 && running && scancodes[msg.data[1]] !== undefined) {
			keyBuffer.push(msg.data[1]);
        }
        break;
    case "input":
        io[0] = parseInt(msg.data[1][0]);
        io[1] = parseInt(msg.data[1][1]);
        break;
    case "reset":
        if (running) { stop(); }
        keyBuffer = [];
        programCounter = 0;
        total_cycles = 0;
        exeMode = "fetch";
        cmdRegs = {word:"0000000000000000", args:[], frameNo:0};
        initArrays();
        sendInfo();
        postMessage(["stepped"]);
        break;
    case "rom":
        rom = msg.data[1];
        break;
    case "debug":
        DEBUG = true;
        break;
    case "info":
        sendInfo();
        break;
    default:
        break;
    }
}

function setClock(hz) {
    stepsPerMsec = Math.round(hz/100);
}

function run() {
    running = true;
    postMessage(["running"]);
    interval = setInterval(function(){ frame(stepsPerMsec) }, 10);
}

function stop() {
    postMessage(["stopped"]);
    sendInfo();
    running = false;
    clearInterval(interval);
}

function frame(cycles) {
    while (cycles-- >= 1 && running) {
        stepProcessor();
        writeRegister(writeBus, dataBus);
        dataBus = 0;
        writeBus = 0;
        total_cycles++
    }
}

function stepProcessor() {
    if (cmdRegs.frameNo > 31) {
        cmdRegs.frameNo -= 32;
    } else if (cmdRegs.frameNo < 0) {
        cmdRegs.frameNo = 32 - Math.abs(cmdRegs.frameNo);
    }

    if (cmdRegs.frameNo > 0) {
        cmdRegs.downFrame = cmdRegs.frameNo - 1;
    } else {
        cmdRegs.downFrame = 31;
    }

    if (cmdRegs.frameNo < 31) {
        cmdRegs.upFrame = cmdRegs.frameNo + 1;
    } else {
        cmdRegs.upFrame = 0;
    }
    count++;
    word = rom[programCounter];
    switch(exeMode) {
    case "fetch": //1
        cmdRegs.word = word;
        cmdRegs.op = parseInt(word.substr(0,3),2);
        cmdRegs.pointers = word.substr(3,7);
        cmdRegs.argsRemain = parseInt(word.substr(0,2),2);
        cmdRegs.isCnd = word.substr(15);
        exeMode = "load";
        DEBUG && console.log("  fetch: " + word + " has " + cmdRegs.argsRemain + " arg(s)");
        programCounter++;
        break;
    case "load": //2
        if (cmdRegs.argsRemain !== 0) {
            if (cmdRegs.pointers.charAt(cmdRegs.argsRemain-1) == "1") {
                DEBUG && console.log("load: " + readRegister(parseInt(word,2)) + " -> arg reg #" + cmdRegs.argsRemain + " substituted from " + word);
                cmdRegs.args[cmdRegs.argsRemain] = readRegister(parseInt(word,2)).toString(2);
            } else {
                DEBUG && console.log("load: " + word + " -> arg reg #" + cmdRegs.argsRemain + " non-substituted");
                cmdRegs.args[cmdRegs.argsRemain] = word;
            }
            cmdRegs.argsRemain--;
            programCounter++;
        } else {
            exeMode = "exe"; //all args fetched, now to execute the cmd
        }
        break;
    case "exe": //3
		if (!(cmdRegs.isCnd == "1" && cnd == 1)) {
			switch(cmdRegs.op) {
				case 0: //stop
					DEBUG && console.log("       ↳ stop");
					stop();
					break;
				case 1: //return func
					DEBUG && console.log("       ↳ return: return to 0x" + stack[cmdRegs.frameNo][511].toString(16));
					programCounter = stack[cmdRegs.frameNo][511];
                    cmdRegs.frameNo--;
					break;
				case 2: //goto
					DEBUG && console.log("       ↳ goto: " + cmdRegs.args[1]);
					programCounter = parseInt(cmdRegs.args[1].substr(1,16),2);
					break;
				case 3: //call func
					DEBUG && console.log("       ↳ call: @ 0x" + (parseInt(cmdRegs.args[1],2)-32768).toString(16) + " and return to 0x" + programCounter.toString(16));
                    stack[cmdRegs.upFrame][511] = programCounter;
                    cmdRegs.frameNo++;
					programCounter = parseInt(cmdRegs.args[1],2)-32768;
					break;
				case 4: //write
					DEBUG && console.log("       ↳ write: " + parseInt(cmdRegs.args[2],2) + " -> " + cmdRegs.args[1]);
					dataBus = parseInt(cmdRegs.args[2],2);
					writeBus = parseInt(cmdRegs.args[1],2);
					break;
				case 5: //copy
					DEBUG && console.log("       ↳ copy: " + parseInt(cmdRegs.args[2],2) + " -> " + cmdRegs.args[1]);
					dataBus = readRegister(parseInt(cmdRegs.args[2],2));
					writeBus = parseInt(cmdRegs.args[1],2);
					break;
				default:
					DEBUG && console.log("Unrecognized OP");
					break;
			}
		}
        exeMode = "fetch"; // we've executed this one, so get next command (in the next cycle)
        DEBUG && console.log(""); //and put a line break in console for clarity
    default:
        break;
    }
}

//ram -1 (512)     1  0001   4096-8191       blk mem
//ram    (512)     2  0010   8192-12287      blk mem
//ram +1 (512)     3  0011   12288-16383     blk mem
//alu    (14)      4  0100   16384-20479     discrete  (16)
//io     (5)       5  0101   20480-24575     discrete  (8)
//gpu    (1024)    6  0110   24576-28671     blk mem
//cnd    (1)       -  0111   32767           discrete  (8)
//rom    (32767)   -  1---                   blk mem

function stepRegisters() {
    //ALU
        //arithmetic section
        alu[3] = alu[1] + alu[2]; 	// ALU+      is ALU1 + ALU2
        if (alu[2] > alu[1]) {
            alu[4] = 0x10000 - alu[2];
        } else {
            alu[4] = alu[1] - alu[2]; 	// ALU-      is ALU1 - ALU2
        }
        alu[5] = alu[1] >> 1;        // ALU>>     is ALU1 >> 1
        alu[6] = alu[1] << 1;        // ALU<<     is ALU1 << 1

        //logic section
        alu[7] = alu[1] & alu[2];          // ALU&      ALU1 bit-wise and ALU2
        alu[8] = alu[1] | alu[2];          // ALU|      ALU1 bit-wise or ALU2
        alu[9] = alu[1] ^ 0xffff;                  // ALU~      bit-wise not ALU1
        alu[10] = alu[1] > alu[2] ? 1 : 0;  // ALU>      ALU1 > ALU2         --extra part on end makes sure is so it is 1 or 0 not a javascript bool
        alu[11] = alu[1] < alu[2] ? 1 : 0;  // ALU<      ALU1 < ALU2
        alu[12] = alu[1] == alu[2] ? 1 : 0; // ALU=      ALU1 = ALU2
        alu[13] = alu[3] > 0xffff ? 1 : 0;	// ALU.ov has addition overflowed?
    //IO
        //~ io[0] USR1      user-input 1            1
        //~ io[1] USR2      user-input 2            2
        //~ io[2] DCM1      leds 1                  3
        //~ io[3] DCM2      leds 2                  4
        //~ io[4] DCM3      leds 3                  5
        //~ io[5] KBD       keyboard FIFO           6
    //test
        for (var y=0; y < 14; y++) {
            if (alu[y] > 65535) {
                alu[y] = parseInt(alu[y].toString(2).slice(-16),2);
            }
        }
    //       adder/subtractor    Lshifter    Rshifter   AND   OR   NOT  comparator
}

function writeRegister(addr, value) {
    value = value || 0;
    addr = addr || 0;
    if (addr >= 4096 && addr <= 4607) {             //ram-1   4096-8191    1    0001
        if (cmdRegs.frame !== 0) { stack[cmdRegs.downFrame][addr-4096] = value; }

    } else if (addr >= 8192 && addr <= 8703) {      //ram     8192-12287   2    0010
        stack[cmdRegs.frameNo][addr-8192] = value;

    } else if (addr >= 12288 && addr <= 12800) {    //ram+1   12288-16383  3    0011
        if (cmdRegs.frame !== 31) { stack[cmdRegs.upFrame][addr-12288] = value; }

    } else if (addr >= 16384 && addr <= 16399) {    //alu     16384-20479  4    0100
        alu[addr-16384] = value;

    } else if (addr >= 20480 && addr <= 20485) {    //io      20480-24575  5    0101
        io[addr-20480] = value;

    } else if (addr >= 24576 && addr <= 25599) {    //vram    24576-28761  6    0110
        gpu_buffer.push([addr-24576 , value.toString(2)]);
        vram[addr-24576] = value;

    } else if (addr == 32767) {                     //cnd     32767        7    0111
        if (value == undefined) {return;}
        cnd = value.toString(2).endsWith("1") ? 1 : 0;

    } else if (addr >= 32768 && addr <= 65535) {    //rom     32768        -    1---
        rom[addr-32768] = value;

    } else {
        return;
        DEBUG && console.error("out of bounds write: "+addr.toString());
    }
    stepRegisters();
}

function readRegister(addr) {
	if (addr >= 4096 && addr <= 4607) {             //ram-1   4096-8191    1    0001
        if (cmdRegs.frame !== 0) { return stack[cmdRegs.downFrame][addr-4096]; }

    } else if (addr >= 8192 && addr <= 8703) {      //ram     8192-12287   2    0010
        return stack[cmdRegs.frameNo][addr-8192];

    } else if (addr >= 12288 && addr <= 12800) {    //ram+1   12288-16383  3    0011
        if (cmdRegs.frame !== 31) { return stack[cmdRegs.upFrame][addr-12288]; }

    } else if (addr >= 16384 && addr <= 16400) {    //alu     16384-20479  4    0100
        return alu[addr-16384];

    } else if (addr >= 20480 && addr <= 20485) {    //io      20480-24575  5    0101
        if (addr == 20485) {
            var code = keyBuffer.shift();
            if (code == undefined) {
                return 0;
            } else {
                return scancodes[code];
            }
        } else {
            return io[addr-20480];
        }

    } else if (addr >= 24576 && addr <= 25599) {    //vram    24576-28761  6    0110
        return vram[addr-24576];

    } else if (addr == 32767) {                     //cnd     32767        7    0111
		return cnd;

    } else if (addr >= 32768 && addr <= 65535) {    //rom     32768        -    1---
        return parseInt(rom[addr-32768],2);

    } else {
        return 0;
        DEBUG && console.error("out of bounds read: "+addr.toString());
    }
}
