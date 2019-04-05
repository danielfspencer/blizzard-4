$( document ).ready(() => {
    storage_get_key("starting-page",get_starting_page,"dem")
    storage_get_key("theme",get_theme,"light")

    $( "#close" ).click(function() {
        window.close()
    })

    $( "#reset" ).click(function() {
        storage_clear()
    })

    $( "#dark-theme" ).change(function() {
        if ($(this).prop("checked")) {
            storage_set_key("theme","dark")
        } else {
            storage_set_key("theme","light")
        }
    })

    $( "#starting-page" ).change(function() {
        storage_set_key("starting-page",$(this).val())
    })
})


function get_theme(theme) {
    $("#dark-theme").prop('checked', theme == "dark")
}

function get_starting_page(page) {
    $("#starting-page").val(page)
}

/* theme setting */

function inject_stylesheet(path, target) {
    var stylesheet = document.createElement("link")
    stylesheet.href = path
    stylesheet.rel = "stylesheet"
    stylesheet.type = "text/css"
    target.body.appendChild(stylesheet)
}

function set_theme(theme) {
    if (theme == "light") { return }
    var path = "../assets/themes/" + theme
    inject_stylesheet(path + "_content.css", document)
    inject_stylesheet(path + "_frame.css", document)
}
