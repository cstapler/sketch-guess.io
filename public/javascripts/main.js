$(document).ready(function(){
    $("#directions").append("The goal of this game is to guess what object is being drawn on the canvas. Whoever presses the \'Start Game\' button will be the artist. They will be given an object to draw. Everyone else guesses the object by typing into the chatroom. The user who guesses correctly will receive one point. If nobody guesses correctly before time runs out, the artist will lose one point.");
   var mouse = {
      click: false,
      move: false,
      pos: {x:0, y:0},
      pos_prev: false
   };
   // get canvas element and create context
   var canvas  = document.getElementById('drawing');
   var offsetX = $(canvas).offset().left;
   var offsetY = $(canvas).offset().top;
   var context = canvas.getContext('2d');
   context.lineWidth = 2;
   var width   = canvas.width;
   var height  = canvas.height;
   var username = sessionStorage.getItem("current-user");
   var socket  = io.connect('http://localhost:3030', {query: "username=" + username});
   refreshLeaderboard();

   canvas.onmousedown = function(e){ mouse.click = true; };
   canvas.onmouseup = function(e){ mouse.click = false; };

   canvas.onmousemove = function(e) {
      offsetX = $(canvas).offset().left;
      offsetY = $(canvas).offset().top;
      mouse.pos.x = parseInt(e.pageX - offsetX);
      mouse.pos.y = parseInt(e.pageY - offsetY);
      mouse.move = true;
   };

	socket.on('draw_line', function (data) {
      var line = data.line;
      context.beginPath();
      context.arc(line[1].x,line[1].y,line[3],0,Math.PI*2,true);
      context.strokeStyle = line[2];
      context.fillStyle = line[2];
      context.fill();
      context.stroke();
   });


   // main loop, running every 25ms
   function mainLoop() {
      if (mouse.click && mouse.move && mouse.pos_prev) {
         socket.emit('draw_line',
         { line: [ mouse.pos, mouse.pos_prev,
                context.strokeStyle , context.lineWidth] });
         mouse.move = false;
      }
      mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y};
      setTimeout(mainLoop, 5);
   }
   mainLoop();


   $("#clear-btn").click(function(){
     clearCanvas();
   });
   $(".color-btn").click(function(e){
     context.strokeStyle = $(e.target).data('color');
   });
   $("#width-select").change(function(e){
     context.lineWidth = $(e.target).val();
   })

   function clearCanvas() {
     socket.emit('clear_canvas');
   }
   socket.on('clear_canvas', function (data) {
     context.clearRect(0, 0, canvas.width, canvas.height);
  });


   $("#send-message").click(function(){
     sendMessage();
   });

   function sendMessage(){
     var user = "Guest";
     var artist = sessionStorage.getItem("current-artist");
     if(sessionStorage.getItem("current-user")){
       user = sessionStorage.getItem("current-user");
     }
     var newMessage = $("#new-message").val();
     $("#new-message").val("");
     socket.emit('send_message', { message: [ user, newMessage ] });

     var secretWord = sessionStorage.getItem("secret-word");
     if(secretWord != "" && secretWord != null){ //if there is a game going
       if(newMessage.toLowerCase() == secretWord.toLowerCase()
            && artist != user){
         endGame(user, 1, 1, sessionStorage.getItem("current-artist"));
       }
     }
    document.getElementById('new-message').onkeydown = function(e){
    if(e.keyCode == 13){
            sendMessage();
        }
    };

   }
   socket.on('send_message', function (data) {
     var user = data.message[0];
     var message = data.message[1];
     var feed =  $("#chat-feed");
     var currentFeed = feed.text();

     var node = document.createTextNode(user + ": " + message);         // Create a text node
     if(currentFeed != ""){
       feed.append("<br>");
     }
     feed.append(node);
     var elem = document.getElementById('feeddiv');
     elem.scrollTop = elem.scrollHeight;
     });

     //Start game--------------------------------------------------------------------------
     $("#start-game-btn").click(function(){
       startGame();
     });
     function startGame(){
       socket.emit('start_game', { artist: [sessionStorage.getItem("current-user")] });
       socket.emit('send_message', { message: [ "Server", "A game has started!" ] });
     }
     socket.on('start_game', function (data) {
       var user = sessionStorage.getItem("current-user");
       var artist = data.artist;
       var secretWord = data.wordToGuess;
       sessionStorage.setItem("secret-word", secretWord);
       sessionStorage.setItem("current-artist", artist);
       $("#start-game-btn").hide();
       $('#game-info').empty();
       if(artist == user){
         $('#game-info').append("You are the artist! The secret word is: \"" + secretWord + "\"");
       }else{
         $('#game-info').append(artist + " is the artist! Guess what they are drawing!");
       }
       startTimer(artist);
     });

     function startTimer(artist) {
       var timeLeft;
       var timer = 59;
       var countdown = setInterval(function () {
          timeLeft = parseInt(timer % 60, 10);
          timeLeft = timeLeft < 10 ? "0" + timeLeft : timeLeft;
          $("#timer-container").text("There are " + timeLeft + " seconds left of this round.");
          if (--timer < 0) {
              clearInterval(countdown);
              if(artist == sessionStorage.getItem("current-user")){
                endGame(artist, 0, -1, artist);
              }
              $("#timer-container").empty();
          }else if(sessionStorage.getItem("secret-word") == ""){
            clearInterval(countdown);
            $("#timer-container").empty();
          }
      }, 1000);
    }

     //End game--------------------------------------------------------------------------
     function endGame(winner, reason, score, artist){
       socket.emit('end_game', { winner:  winner, reason: reason, score: score, artist: artist});
       if(reason == 1){
           socket.emit('send_message', { message: [ "Server", winner + " guessed correctly!" ] });
       }else{
           socket.emit('send_message', { message: [ "Server", "Game over! Time ran out!" ] });
       }
       clearCanvas();
        }

     socket.on('clear_chat', function (data) {
         $("chat_feed").empty();
     });

     socket.on('end_game', function (data) {
       refreshLeaderboard();
       sessionStorage.setItem("secret-word", "");
       sessionStorage.setItem("current-artist", "");
       var winner = data.winner;
       var user = sessionStorage.getItem("current-user");
       $("#start-game-btn").show();
       $('#game-info').empty();
       if(data.reason == 0){
         if(winner == user){
           $('#game-info').append("You lost because time ran out before anyone guessed correctly!");
         }else{
           $('#game-info').append("The artist, " + winner + ", lost because time ran out!");
         }
       }else{
         if(winner == user){
           $('#game-info').append("You guessed correctly!");
         }else{
           $('#game-info').append(winner + " guessed correctly!");
         }

       }
     });

     function refreshLeaderboard(){
       socket.emit('view_leaderboard');
     }
     socket.on('view_leaderboard', function (data) {
       var wins = data.wins;
       var users = data.usernames;
       $("#leaderboard").empty();
       for(var i = 0; i < wins.length; i++){
         $('#leaderboard').append(users[i] + ": " + wins[i] + "</br>");
       }
     });
});
