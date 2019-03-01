$( document ).ready(function() {
    $( "#licence" ).click(function() {
      if (!window.chrome) {
        window.open("licence.html",'Licence','height=800,width=600');
      } else {
          chrome.app.window.create('licence.html', {
            "resizable": true,
            "bounds": {
              width: 462,
              height: 680
            }
          });
        }
    });

    $( "#close" ).click(function() {
        window.close();
    });
});
