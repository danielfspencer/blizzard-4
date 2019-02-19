$( document ).ready(function() { //connect all the butons to their actions!
  $("#changelog-content").load("../change.log");

  $(".banner img").click(function() {
      $("#popup").css("display","block");
      $("#container").append("<img src='"+$(this).attr("src")+"'/>");
  });

  $("#exit").click(function() {
      $("#popup").css("display","none");
      $("#container").empty();
  });
});
