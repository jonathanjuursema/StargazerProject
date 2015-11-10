/* This program should be run on the computer connected to the turret. */

/* Loading required dependencies. */
var config = require("./config.js");
var serialport = require("serialport");
var SerialPort = serialport.SerialPort;
var io = require('socket.io-client');

var target = { 'az': 0, 'alt': 0 }
var prevtarget = { 'az': 0, 'alt': 0 }


/* Establishing Arduino connection */
var arduino = false;

function initserial() {
  
  arduino = new SerialPort("/dev/ttyACM0", {
    baudrate: 9600,
    parser: serialport.parsers.readline("\r\n")
  });
  
  arduino.on("data", function(data) {
    var d = data.split("D");
    var a = d[1].split("A");
    d = a[0];
    a = a[1];
    socket.emit('setorientation', { 'alt': (a / config.stepsperrev * 360), 'az': (d / config.stepsperrev * 360) });
  });
  
}

var socket = io.connect('http://'+config.hostname+':'+config.webport);

socket.on('connect', function() {
	console.log('Connected to the server.');
  socket.emit('becometurret', config.secret);
  initserial();
});

socket.on('turret', function(data) {
  if (data) {
    console.log('Authenticated as turret.');
  }
});

socket.on('target', function(data) {
  target.az = Math.round(data.az / 360 * config.stepsperrev);
  target.alt = Math.round(data.alt / 360 * config.stepsperrev);
  if (prevtarget.az != target.az || prevtarget.alt != prevtarget.alt) {
    prevtarget.az = target.az; prevtarget.alt = prevtarget.alt;
    var cmd = "D"+target.az+"A"+target.alt;
    if (arduino !== false) {
      arduino.write(cmd, function(error) {});
    }
  }
});