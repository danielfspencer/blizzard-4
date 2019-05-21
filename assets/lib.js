function load_file(e, target) {
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

function get_platform() {
  try {
    var ref = chrome.storage.local
  } catch (e) {

  }

  if (typeof ref !== 'undefined') {
    return "chrome_app"
  }

  if (typeof require !== 'undefined') {
    return "electron"
  }

  return "website"
}

function storage_set_key(key,value) {
  if (get_platform() == "chrome_app") {
    var obj = {}
    obj[key] = value
    chrome.storage.local.set(obj)
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

function storage_get_key(key,callback,default_value) {
  if (get_platform() == "chrome_app") {
    chrome.storage.local.get([key], (items) => {
      var result = items[key]
      if (result === undefined) {
        callback(default_value)
      } else {
        callback(result)
      }
    })

  } else {
    var result = localStorage.getItem(key)
    if (result == null) {
      callback(default_value)
    } else {
      try {
        callback(JSON.parse(result))
      } catch (e) {
        callback(result)
      }
    }
  }
}

function storage_clear(key,value) {
  if (get_platform() == "chrome_app") {
    chrome.storage.local.clear()
  } else {
    localStorage.clear()
  }
}
