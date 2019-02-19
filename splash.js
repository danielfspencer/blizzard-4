$( document ).ready(function() {
    $( "#licence" ).click(function() {
      if (!window.chrome) {
        window.open("licence.html",'Licence','height=680,width=480');
      } else {
          chrome.app.window.create('licence.html', {
            "resizable": true,
            "bounds": {
              width: 462,
              height: 680
            }
          });
        }
        window.close();
    });

    $( "#close" ).click(function() {
        window.close();
    });
});
