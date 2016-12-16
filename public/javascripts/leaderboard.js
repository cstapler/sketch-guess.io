$(document).ready(function(){
  function viewLeaderboard(){
    socket.emit('view_leaderboard');
  }
  socket.on('view_leaderboard', function (data) {
    console.log("Wins: " + data);
  });
})
