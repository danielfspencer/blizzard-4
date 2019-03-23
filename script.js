function menu(item) {  //called when a user selects a menu item
    $( "[id^=menu-item-]").removeClass("active") //un-select all options
    $( "#"+item ).addClass("active") // select the new one
    switch(item.slice(-3)) { //change title and content accordingly
	case "asm":
	    $("#toolbar-title").html("Assembler")
	    $("#content").attr("src","assembler/assembler.html")
	    break
	case "cmp":
	    $("#toolbar-title").html("Compiler")
	    $("#content").attr("src","compiler/compiler.html")
	    break
	case "emu":
	    $("#toolbar-title").html("Emulator")
	    $("#content").attr("src","emulator/emulator.html")
	    break
	case "man":
	    $("#toolbar-title").html("Manual")
	    $("#content").attr("src","manual/manual.html")
	    break
    case "dem":
        $("#toolbar-title").html("Demo Programs")
        $("#content").attr("src","demo/demo.html")
        break
	}
	$( "#menu" ).removeClass("active") //close menu
    $( "#dim" ).removeClass("active") //remove menu's shadow
}

function set_theme(theme) {
    if (name == null) { return }
    current_theme = theme

    var path = "assets/themes/" + theme + "_frame.css"
    inject_stylesheet(path, document)
    child_set_theme(document.getElementById("content").contentDocument)
}

function inject_stylesheet(path, target) {
    var stylesheet = document.createElement("link")
    stylesheet.href = path
    stylesheet.rel = "stylesheet"
    stylesheet.type = "text/css"
    target.body.appendChild(stylesheet)
}

function child_set_theme(target) {
    if (current_theme == null) { return }
    var path = "../assets/themes/" + current_theme + "_content.css"
    inject_stylesheet("../"+path, target)
}

function child_page_loaded() {
  if (input_data_waiting) {
    input_data(data)
    input_data_waiting = false
  }
}

function handleMsg(event) {
    data = event.data.slice(1)
    input_data_waiting = true
    menu(event.data[0])
}

function toggle_overflow_menu() {
    $( "#dropdown-menu" ).toggleClass("active")
    $( "#overflow-close" ).toggleClass("active")
}

function toggle_menu() {
    $( "#menu" ).toggleClass("active")
    $( "#dim" ).toggleClass("active")
}

var input_data_waiting = false
var current_theme = null

$( document ).ready(function() { //connect all the butons to their actions!
    storage_get_key("theme",set_theme,null)
    storage_get_key("starting-page",(page) => (menu("menu-item-"+page)),"dem")

    materialDesignHamburger()

    $( ".material-design-hamburger" ).click(function() { //show or hide menu on button press
        toggle_menu()
    })

    $( "#close" ).click(function() {
        window.close()
    })

    $( "#mini" ).click(function() {
        chrome.app.window.current().minimize()
    })

    $( "#max" ).click(function() {
        if (chrome.app.window.current().isMaximized()) {
            chrome.app.window.current().restore()
            chrome.app.window.current().outerbounds('height=218,width=734')
        } else {
            chrome.app.window.current().maximize()
        }
    })

    $( "#about" ).click(function() {
        toggle_overflow_menu()
        if (is_chrome_app()) {
            var page = chrome.app.window.create('about/about.html', {
                "frame": "none",
                "resizable": false,
                "bounds": {
                    width: 734,
                    height: 218
                }
            })
        } else {
            var page = window.open("about/about.html",'About','height=218,width=734')
        }
        console.log(page)
    })

    $( "#settings" ).click(function() {
        toggle_overflow_menu()
        if (is_chrome_app()) {
            var page = chrome.app.window.create('settings/settings.html', {
                "frame": "none",
                "resizable": false,
                "bounds": {
                    width: 400,
                    height: 500
                }
            })
        } else {
            var page = window.open("settings/settings.html",'Settings','height=500,width=400')
        }
        console.log(page)
    })

    $( "#dim" ).click(function() { //or hide when user clicks off it
        toggle_hamburger()
        toggle_menu()
    })

    $( "#overflow-menu" ).click(function() {
        toggle_overflow_menu()
    })

    $("#overflow-close").click( function () {
        toggle_overflow_menu()
    })

    $( "[id^=menu-item-]").click(function() { //report which tab user has selected
		menu(this.id)
        toggle_hamburger()
	})

    $.getJSON("manifest.json")
        .done(function(data) {
            $("#version").html("Version: " + data["version_name"])
        })

    $(document).on("keydown", function(e) {
        if (e.keyCode == 33) {
            e.preventDefault()
        }
    })
})

window.addEventListener('message', handleMsg, false)
