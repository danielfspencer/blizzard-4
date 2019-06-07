chrome.app.runtime.onLaunched.addListener( () => {
  chrome.app.window.create('index.html', {
    "frame": "none",
    "resizable": false,
    "bounds": {
      width: 1526,
      height: 656
    }
  })
})
