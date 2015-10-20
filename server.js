/* Loading required dependencies. */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var socketio = require('socket.io')(http);
var spi = require('spi');

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
app.use(express.static('htdocs'));
http.listen(process.env.PORT || 5000);

/* Handling Socket.IO input */
socketio.on('connection', function(socket) {
  console.info("A new connection was established.");
});

/* Establishing SPI connection */
var soc = new spi.Spi('/dev/spidev0.0', {}, function(s){s.open();});

setInterval(function() {
  soc.transfer(new Buffer([ 0x00 ]), new Buffer([ 0x00 ]), function(dev, buf) {
    console.info("SPI: Test 00 sent.");
    setTimeout(function() {
      soc.transfer(new Buffer([ 0x42 ]), new Buffer([ 0x00 ]), function(dev, buf) {
        console.info("SPI: Test 42 sent.");
      });
    }, 1000);
  });
}, 2000)