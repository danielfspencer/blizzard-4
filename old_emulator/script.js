ops = [
    "stop",
    "copy",
    "write",
    "goto",
    "call",
    "return"
];

g_data = {};
var g_screen_updates = [];
var high_colour = 255;
var low_colour = 0;

function toggleScreenMode() {
    var screen = document.getElementById("screen");
    var div = document.getElementById("scr-type");

    if (screen.style.background == "rgb(255, 255, 255)") { // is white background
        div.innerHTML = "W on B";
        screen.style.background = "rgb(0, 0, 0)";
        high_colour = 255;
        low_colour = 0;
    } else {
        div.innerHTML = "B on W"
        screen.style.background = "rgb(255, 255, 255)";
        high_colour = 0;
        low_colour = 255;
    }
}

function msg(data) {
    worker.postMessage(data);
}

function formatRom(string) {
	var newlines = "";
	string = string.replace(/^\s+|\s+$/g, "");
    for (var i=0; i<21; i++) { newlines += String.fromCharCode(13, 10);}
	return string+newlines;
}

function set_rom(string) {
	$("#rom").val(string);
	msg(["rom",$("#rom").val().split("\n")]);
	$("#rom").val(formatRom($("#rom").val()));
}

function draw(data) {
    $("#buffer").html( data.buffer );
    $("#bufferInfo").html( data.buffer.length + "/256" );
    $("#pc").html( "0x" + ("0000" + data.progCount.toString(16)).substr(-4,4) );
    $("#mode").html( data.mode );
    $("#curr-op").html( data.cmdRegs.word.substr(0,3) );
    $("#curr-arg-info").html( data.cmdRegs.word.substr(3,7) );
    $("#curr-arg-no").html( data.cmdRegs.word.substr(10,3) );
    $("#curr-unused").html( data.cmdRegs.word.substr(13,2) );
    $("#curr-cnd").html( data.cmdRegs.word.substr(15) );

    $("#curr-op-desc").html( ops[parseInt(data.cmdRegs.word.substr(0,3),2)] )
    $("#curr-arg-no-desc").html( parseInt(data.cmdRegs.word.substr(10,3),2) + " arg(s)" );

    if ( data.cmdRegs.word.substr(15) == "1") {
        $("#curr-cnd-desc").html("conditional");
    } else {
        $("#curr-cnd-desc").html("not condit_");
    }

    g_screen_updates.push.apply(g_screen_updates,data.gpubuffer);
    vram_updates(g_screen_updates);

    $("#args-1").html(data.cmdRegs.args[1]);
    $("#args-2").html(data.cmdRegs.args[2]);

    $("#frame").html(data.cmdRegs.frameNo);

    dcm1.setValue(("00000" + data.dcm[0]).slice(-5));
    dcm2.setValue(("00000" + data.dcm[1]).slice(-5));
    dcm3.setValue(("00000" + data.dcm[2]).slice(-5));
    $("#rom").scrollTop((data.progCount-1)*15);
}

function vram_updates(stack) {
    while (stack.length > 0) {
        var item = stack.shift();
        var y = Math.floor(item[0] / 8);
        var x = (item[0] % 8) * 16;
        var word = (("0000000000000000" + item[1]).slice(-16));

        var imgData = ctx.createImageData(16,1);
        for (var i = 0; i < imgData.data.length; i += 4) {
            if (word.charAt(i/4) == "1") {
                var value = high_colour;
            } else {
                var value = low_colour;
            }
            imgData.data[i]     = value;
            imgData.data[i + 1] = value;
            imgData.data[i + 2] = value;
            imgData.data[i + 3] = 255;
        }
        ctx.putImageData(imgData,x,y);
    }
}

function handleMsg(data) {
    switch(data[0]) {
        case "running":
            requestAnimationFrame(update);
            break;
        case "stopped":
            cancelAnimationFrame(g_id);
            draw(g_data);
            break;
        case "stepped":
            draw(g_data);
            break;
        case "speed":
            document.getElementById("load").innerHTML = "Act: " + data[1] + " Hz";
            break;
        case "info":
            g_data = data[1];
            g_line = data[1].progCount;
            break;
        default:
            break;
    }
}

function update() {
       draw(g_data);
       msg(["info"]);
       g_id = requestAnimationFrame(update);
}

function init() {
    g_data = {};
    g_line = 0;
    g_screen_updates = [];
    worker = new Worker("engine.js");
    worker.onmessage = function(event) {
        handleMsg(event.data);
    };

    canvas = document.getElementById("screen");
    ctx = canvas.getContext("2d");

    msg(["clock",$("#speed").val()]);

    $("#rom").focusout(function(event){
        setRom($("#rom").val());
    });

    $("#speed").focusout(function(event){
        msg(["clock",$("#speed").val()]);
    });

    $("#usr1, #usr2").change(function(event){
        $("#usr1").val(Math.round($("#usr1").val()))
        $("#usr2").val(Math.round($("#usr2").val()))
        if ($("#usr1").val() > 65535) {$("#usr1").val(65535); }
        if ($("#usr2").val() > 65535) {$("#usr2").val(65535); }
        msg(["input",[$("#usr1").val(),$("#usr2").val()]]);
    });

    document.addEventListener("keydown", function(event){
        msg(["key",event.key]);
    });

    ref = $(".lined").linedtextarea(
        {selectedLine: 1}
    );

    dcm1 = new SegmentDisplay("dcm1");
    dcm2 = new SegmentDisplay("dcm2");
    dcm3 = new SegmentDisplay("dcm3");

    dcm1.pattern = dcm2.pattern = dcm3.pattern = "#####";
    dcm1.displayAngle =  dcm2.displayAngle =  dcm3.displayAngle = 0;
    dcm1.digitHeight = dcm2.digitHeight = dcm3.digitHeight = 20;
    dcm1.digitWidth = dcm2.digitWidth = dcm3.digitWidth = 12;
    dcm1.digitDistance = dcm2.digitDistance = dcm3.digitDistance = 2.5;
    dcm1.segmentWidth = dcm2.segmentWidth = dcm3.segmentWidth  = 2.5;
    dcm1.segmentDistance = dcm2.segmentDistance = dcm3.segmentDistance = 0.5;
    dcm1.segmentCount = dcm2.segmentCount = dcm3.segmentCount = 7;
    dcm1.cornerType = dcm2.cornerType = dcm3.cornerType = 3;
    dcm1.colorOn = dcm2.colorOn = "#000000"; dcm3.colorOn = "#167AC6"
    dcm1.colorOff = dcm2.colorOff = dcm3.colorOff = "#f1f1f1";

    dcm1.setValue("00000");
    dcm2.setValue("00000");
    dcm3.setValue("00000");
    msg(["rom",document.getElementById("rom").value.split("\n")]);
}



$( document ).ready(function() { //connect all the butons to their actions!
	init(); //set-up the emulator (worker, keypress capture etc.)

	$( "#step" ).click(function() {
        msg(["step"]);
    });
    $( "#start" ).click(function() {
        msg(["rom",document.getElementById("rom").value.split("\n")]);
        msg(["start"]);
    });
    $( "#reset" ).click(function() {
        msg(["reset"]);
        $("#usr1").val(0);
        $("#usr2").val(0);
        ctx.clearRect(0,0,128,128);
        //g_screen_updates = [];
    });
	$( "#stop" ).click(function() {
        msg(["stop"]);
    });
    $( "#scr-type" ).click(function() {
        toggleScreenMode();
    });

    parent.input_data = set_rom;
    parent.child_page_loaded();
});
