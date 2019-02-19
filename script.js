function menu(item) {  //called when a user selects a menu item
    selectedMenuItem = item; //global variable tracking what one we're on
    $( "[id^=menu-item-]").removeClass("active"); //un-select all options
    $( "#"+item ).addClass("active"); // select the new one
    switch(item.slice(-3)) { //change title and content accrodingly
	case "asm":
	    $("#toolbar-title").html("Assembler");
	    $("#content").attr("src","assembler/assembler.html");
	    break;
	case "cmp":
	    $("#toolbar-title").html("Compiler");
	    $("#content").attr("src","compiler/compiler.html");
	    break;
	case "emu":
	    $("#toolbar-title").html("Emulator");
	    $("#content").attr("src","emulator/emulator.html");
	    break;
  case "new":
      $("#toolbar-title").html("Emulator (new version)");
      $("#content").attr("src","new_emulator/emulator.html");
      break;
  case "as2":
      $("#toolbar-title").html("Assembler (new version)");
      $("#content").attr("src","new_assembler/assembler.html");
      break;
	case "doc":
	    $("#toolbar-title").html("Manual");
	    $("#content").attr("src","manual/manual.html");
	    break;
	}
	$( "#menu" ).removeClass("active"); //close menu
	$( "#dim" ).fadeToggle(100); //remove menu's shadow
}

function child_page_loaded() {
  if (input_data_waiting) {
    input_data(data);
    input_data_waiting = false;
  }
}

function handleMsg(event) {
    $("#dim").fadeToggle(100);
    data = event.data[1];
    input_data_waiting = true;
    menu(event.data[0]);
}

input_data_waiting = false;

$( document ).ready(function() { //connect all the butons to their actions!
    menu("menu-item-cmp"); //select the compiler by default
    materialDesignHamburger();

    $( ".material-design-hamburger" ).click(function() { //show or hide menu on button press
        $( "#menu" ).toggleClass("active");
        $( "#dim" ).fadeToggle(100);
    });

    $( "#close" ).click(function() {
        window.close();
    });

    $( "#mini" ).click(function() {
        chrome.app.window.current().minimize();
    });

    $( "#max" ).click(function() {
        if (chrome.app.window.current().isMaximized()) {
            chrome.app.window.current().restore();
            chrome.app.window.current().outerbounds('height=218,width=734');
        } else {
            chrome.app.window.current().maximize();
        }
    });

    $( "#about" ).click(function() {
      toggle_hamburger();
      if (!window.chrome) {
        window.open("splash.html",'About','height=218,width=734');
      } else {
          chrome.app.window.create('splash.html', {
            "frame": "none",
            "resizable": false,
            "bounds": {
              width: 734,
              height: 218
            }
          });
        }
        $( "#menu" ).toggleClass("active");
        $( "#dim" ).fadeToggle(100);
    });

    $( "#dim" ).click(function() { //or hide when user clicks off it
        $( "#menu" ).toggleClass("active");
        $( "#dim" ).fadeToggle(100);
        toggle_hamburger();
    });

    $( "[id^=menu-item-]").click(function() { //report which tab user has selected
		menu(this.id);
        toggle_hamburger();
	});

    $.getJSON("manifest.json")
        .done(function(data) {
            $("#ver").html("Version: " + data["version"]);
        })

    $(document).on("keydown", function(e) {
        if (e.keyCode == 33) {
            e.preventDefault();
        }
    });
});

window.addEventListener('message', handleMsg, false);
