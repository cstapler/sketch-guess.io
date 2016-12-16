var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var socketIo = require('socket.io');

var index = require('./routes/index');
var users = require('./routes/users');
var leaderboard = require('./routes/leaderboard');
var login = require('./routes/login');

var app = express();

app.io = require('socket.io')(); // attached for use elsewhere

//socket.io handler
var canvasHistory = [];
var chatHistory = [];
var clients = [];
var wins = [];
var usernames = [];
var thingstoguess = ["Cat", "Knife", "Bike", "Clothing Hanger", "Cookie",
                    "Mug", "Sunglasses", "Pizza", "Fork", "Phone", "Poop", "Chair",
                    "Laptop", "Dress", "Car", "House", "Foot", "Thumb", "Burger",
                    "Pencil", "Boat", "Airplane", "Hat", "Flower", "Ghost", "Carrot",
                    "Guitar", "Shoe", "Paperclip", "Flashlight", "Scissors", "Watch",
                    "Key", "Toothbrush", "Paper", "Ball", "Umbrella", "Bottle",
                    "Purse", "Hat", "Pretzel", "Fish"];

app.io.on('connection', (client) => {
  clients.push(client);
  if(clients.length == 1){
       //First client will have a blank canvas and chat
      canvasHistory = [];
      chatHistory = [];

  }
  wins.push(0);
  var currentUser = client.handshake.query.username;
  if(currentUser != "null"){
      usernames.push(currentUser);
  }else{
      usernames.push("Guest");
  }
  app.io.emit('view_leaderboard', { usernames: usernames, wins: wins });


  //Canvas----------------------------------------------------
  for (var i in canvasHistory) {
    client.emit('draw_line', { line : canvasHistory[i] });
  }
  client.on('draw_line', (data) => {
    canvasHistory.push(data.line);
    app.io.emit('draw_line', { line: data.line });
  });
  client.on('clear_canvas', (data) => {
    app.io.emit("clear_canvas", { history: canvasHistory });
  });

  //Chat--------------------------------------------------------
  for (var i in chatHistory) {
    client.emit('send_message', { message : chatHistory[i] });
  }
  client.on('send_message', (data) => {
    chatHistory.push(data.message);
    app.io.emit('send_message', { message: data.message });
  });
  client.on('clear_chat', (data) => {
    chatHistory = [];
    app.io.emit("clear_chat", { history: chatHistory });
  });

  //Game logic-------------------------------------------------
  client.on('start_game', (data) => {
    var wordIndex = Math.floor((Math.random() * (thingstoguess.length)));
    var wordToGuess = thingstoguess[wordIndex];
    var artist = data.artist;

    app.io.emit('start_game', { artist: artist, wordToGuess: wordToGuess });
  });
  client.on('end_game', (data) => {
    app.io.emit('end_game', { winner: data.winner, reason: data.reason });
    var index1 = clients.indexOf(client);
    wins[index1] += data.score;
    if(data.reason == 1){ //someone guessed correctly
        var artist = data.artist;
        var index2 = usernames.indexOf(artist);
        wins[index2] += data.score;
    }

  });

  //Leaderboard-------------------------------------------------
  client.on('view_leaderboard', (data) => {
    app.io.emit('view_leaderboard', { usernames: usernames, wins: wins });
  });

  client.on('disconnect', function() {
    clients.splice(clients.indexOf(client), 1);
    wins.splice(clients.indexOf(client), 1);
    usernames.splice(clients.indexOf(client), 1);
    app.io.emit('send_message', {message : ["Server", "A user has left the game"]});
    app.io.emit('view_leaderboard', { usernames: usernames, wins: wins });

  });
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Make app.io accessible to our router
app.use(function(req,res,next){
    req.io = app.io;
    next();
});

//routes
app.use('/', login);
app.use('/main', index);
app.use('/users', users);
app.use('/leaderboard', leaderboard)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
