$( document ).ready(() => {
    storage_get_key("starting-page",set_starting_page,"dem")
    storage_get_key("theme",set_theme,"light")

    $( "#close" ).click(function() {
        window.close()
    })

    $( "#dark-theme" ).change(function() {
        if ($(this).prop("checked")) {
            storage_set_key("theme","dark")
            console.log("saving page to storage: dark")
        } else {
            storage_set_key("theme","light")
            console.log("saving page to storage: light")
        }
    })

    $( "#starting-page" ).change(function() {
        console.log("saving page to storage: " + $(this).val())
        storage_set_key("starting-page",$(this).val())
    })
})

function set_theme(theme) {
    console.log("theme from storage: " + theme)
    $("#dark-theme").prop('checked', theme == "dark")
}

function set_starting_page(page) {
    console.log("page from storage: " + page)
    $("#starting-page").val(page)
}
