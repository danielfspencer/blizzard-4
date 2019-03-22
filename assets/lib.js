function loadFile(e, target) {
    var file = e.target.files[0];
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.fileName = file.name;
    reader.onload = function(e) {
        var contents = e.target.result;
        $("#"+target).val(contents);
        $("#name").val(e.target.fileName.split(".")[0]);
    };
    reader.readAsText(file);
}

function is_chrome_app() {
    try {
        var ref = chrome.storage.local
        return true
    } catch (e) {
        return false
    }
}
