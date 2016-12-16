$(document).ready(function(){
  $('#login').click(function(){
    var username = $("#username").val();
    sessionStorage.setItem("current-user", username);
    window.location.href = "main";
  })
})
