$( document ).ready(function() { //connect all the butons to their actions!
    $("#save_in").click(function() {
        saveFile($("#in").val(),$("#name").val()+".asm");
    });

    $("#load_in").change(function(e) {
        loadFile(e, "in");
    });

    $("#save_out").click(function() {
        saveFile($("#out").val(),$("#name").val()+".bin");
    });

    $("#cmp").click(function() {
        $("#out").val(assemble($("#in").val()));
        $("#size").html($("#out").val().lineCount()*2+"B");
    });

    $("#run").click(function() {
        parent.postMessage(["emu",$("#out").val()],"*");
    });

    $("#auto").change(function() {
        if(this.checked) {
            $("#in").on( "keyup", function() { $("#out").val(assemble($("#in").val())); $("#size").html($("#out").val().lineCount()*2+"B"); });
        } else {
            $("#in").off()
        }
    });

    $(document).on("keydown", function(e) {
        if ((e.keyCode == 10 || e.keyCode == 13) && e.ctrlKey) {
            compile();
        }
    });

    $(function() {
        $(".lined").linedtextarea(
        {selectedLine: 1}
    );
    });


    $("out").val("");
    $("#in").on( "keyup", function() { $("#out").val(assemble($("#in").val())); $("#size").html($("#out").val().lineCount()*2+"B"); });

    $("#in").on("keydown", function (e) {
    var keyCode = e.keyCode || e.which;

    if (keyCode === 9) {
        e.preventDefault();
        var start = this.selectionStart;
        var end = this.selectionEnd;
        var val = this.value;
        var selected = val.substring(start, end);
        var re = /^/gm;
        var count = selected.match(re).length;

        this.value = val.substring(0, start) + selected.replace(re, '  ') + val.substring(end);
        this.selectionStart = start;
        this.selectionEnd = end + count;
    }
    });

    parent.input_data = set_input;
    parent.child_page_loaded();
});

function set_input(string) {
  document.getElementById("in").value = string;
}

opDefs = {
    "stop":0,
    "return":1,
    "goto":2,
    "call":3,
    "write":4,
    "copy":5
}

defs = {
    "alu.1" : 16385,
    "alu.2" : 16386,
    "alu.+" : 16387,
    "alu.-" : 16388,
    "alu.>>" : 16389,
    "alu.<<" : 16390,
    "alu.&" : 16391,
    "alu.|" : 16392,
    "alu.!" : 16393,
    "alu.>" : 16394,
    "alu.<" : 16395,
    "alu.=" : 16396,
    "alu.ov" : 16397,
    "usr.1" : 20480,
    "usr.2" : 20481,
    "dcm.1" : 20482,
    "dcm.2" : 20483,
    "dcm.3" : 20484,
    "kbd": 20485,
    "cnd" : 32767
}

function regToCode(id) {
    if (id.toLowerCase().startsWith("ram-.")) { //it's a ram address (lower)
        var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
        if ( number >= 0 && number <= 511) {
            return number+4096;//it's valid
        } else {
            return false;
        }
    } else if (id.toLowerCase().startsWith("ram.")) { //it's a ram address (current)
        var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
        if ( number >= 0 && number <= 511) {
            return number+8192;//it's valid
        } else {
            return false;
        }
    } else if (id.toLowerCase().startsWith("ram+.")) { //it's a ram address (upper)
        var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
        if ( number >= 0 && number <= 511) {
            return number+12288;//it's valid
        } else {
            return false;
        }
    } else if (id.toLowerCase().startsWith("rom.")) { //it's rom
        var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
        if ( number >= 0 && number <= 32767) {
            return number + 32768; //it's valid
        } else {
            return false;
        }
    } else if (id.toLowerCase().startsWith("vram.")) { //it's vram
        var number = parseInt(id.match(/[^.]*$/)[0], 10) // this is the bits after the dot
        if ( number >= 0 && number <= 1023) {
            return number + 24576; //it's valid
        } else {
            return false;
        }
    } else {
        if (id.toLowerCase() in defs) {
            return defs[id.toLowerCase()];
        } else {
            return false;
        }
    }
}

function opToCode(id) {
    if (id.toLowerCase() in opDefs) {
        return opDefs[id.toLowerCase()];
    } else {
        return false;
    }
}

function pad(num) {
    return ("0000000000000000" + num).slice(-16);
}

function isSquareBracktes(str) {
    var matches = str.match(/\[(.*?)\]/);
    if (matches) {
        return matches[1];
    } else {
        return false;
    }
}

function numToBin(num) {
    if (num.startsWith("0b")) { //it's already in binary
        return pad(num.substring(2));
    } else if (num.startsWith("0x")) { //it's in hexadeciamal
        var dec = parseInt(num.substring(2),16);
        return pad(dec.toString(2));
    } else {  //it's in decimal
        var dec = parseInt(num,10);
        return pad(dec.toString(2));
    }
}

function assemble(code) {
    var lines = code.split("\n"); //split at line ends
    var assembled = [];
    var adr = 0;
    var labels = {};

    //1st pass
    for (var i = 0; i < lines.length; i++) {
        if (lines[i] == "" || lines[i].startsWith("//")) {continue;} // skip empty lines
        var line = lines[i].trim();
        line = line.split(" "); // turns "copy ram1" into ["copy", "ram1"]
        line.map(function(str){str.replace(/(\r|\n)/g,"")}); // strips trailing whitespace

        if (line.length == 1 && !(line[0] in opDefs)) { // if it's one string
            if (line[0].endsWith(":")) { // ends with : means it is a label
                labels[line[0].substr(0, line[0].length - 1)] = adr + 32768;
                continue;
            } else if (line[0].match(/[a-z]/) && !line[0].startsWith("0")) { // label
                assembled[i] = line[0] + "\n"
                adr++
            } else { // if not it's just a number
                assembled[i] = numToBin(line[0]) + "\n";
                adr++;
            }
        } else {
            // it's a command
            var op = line[0];
            var args = [];
            var argNo = 0;
            var pointerMap = "";
            var cnd = "0";

            // assemble the op code
                var decimal = opToCode(op);
                if (op.endsWith("?")) {
                    cnd = "1";
                    op = op.substr(0, line[0].length - 1);
                }
                if (op in opDefs) {
                    op = ("000" + opToCode(op).toString(2)).slice(-3);
                } else {
                    op = "---"
                }
            // assemble the args
            for (var y = 1; y < line.length; y++) {
                var item = line[y];
                if (isSquareBracktes(item) !== false) {
                    var item = isSquareBracktes(item);
                    pointerMap += "1";
                } else {
                    pointerMap += "0";
                }

                if (regToCode(item) !== false) {  // regular reg         -if returns number (!==) prevents a zero being false
                    args[y-1] = numToBin(regToCode(item).toString());
                } else if (item.match(/[a-z]/) && !item.startsWith("0")) { // label
                    args[y-1] = item; // dealt with on 2nd pass
                } else { // number
                    args[y-1] =  numToBin(item);
                }
            }
            // compute number of args
            argNo = ("000" + args.length.toString(2)).slice(-3);
            // computer pointer map
            pointerMap = ("0000000" + pointerMap).slice(-7);
            pointerMap = pointerMap.split('').reverse().join('');
            //now assemble the whole command
            var header = op + pointerMap + "00000" + cnd;
            if (args.length !== 0) {var body = "\n" + args.join("\n") } else {var body = ""}
            assembled.push( header + body + "\n" );
            adr += args.length +1;
        }
    }

    var asm_string = assembled.join(""); //join it all into one string

    //2nd pass
    for (key in labels) {
        var bin = numToBin(labels[key].toString());
        asm_string = asm_string.replace( RegExp("\\b"+key+"\\b","gi") , bin);
    }

    return asm_string;
}
