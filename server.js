/* Loading required dependencies. */
var express = require('express');
var webserver = express();
var socketio = require('socket.io')(webserver.Server);

/* Loading local modules. */
var coreserver = require('./coreserver.js');
var stellariumserver = require('./stellariumserver.js');

/* Starting core server. */
var server = new coreserver();

/* Starting Stellarium server. */
var stellarium = new stellariumserver({
      port: 5050,
      debug: false,
      quiet: true,
      type: 'Stellarium',
      telescopeType: 'laser'
});

/* Starting webserver */
webserver.use(express.static('htdocs'));
webserver.listen(process.env.PORT || 5000);

/* Handling Socket.IO input */
socketio.on('connection', function(socket) {
  console.info("A new connection was established.");
});