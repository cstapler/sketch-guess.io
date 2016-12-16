var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  req.io.emit('send_message', {message : ["Server", "A new user has entered the game"]});
  res.render('index', { title: 'Sketch-Guess.io' });
});

module.exports = router;
