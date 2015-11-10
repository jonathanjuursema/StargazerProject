/* This program should be run on the computer connected to the turret. */

/* Loading required dependencies. */
var config = require("./config.js");
var serialport = require("serialport").SerialPort;
var io = require('socket.io-client');

var target = { 'az': 0, 'alt': 0 }
var prevtarget = { 'az': 0, 'alt': 0 }


/* Establishing Arduino connection */
var arduino = false;
var arduinoopen = false;

function initserial() {
  
  arduino = new serialport("/dev/ttyACM0", {
    baudrate: 9600
  });  
  
  arduino.open(function() {
      arduinoopen = true;
  });
  
  arduino.on("data", function(data) {
    var d = data.split("D");
    var a = d[0].split("A");
    d = a[0];
    a = a[1];
    io.emit('setorientation', { 'alt': (a / config.stepsperrev * 360), 'az': (d / config.stepsperrev * 360) });
  });
  
}

//initserial();

var socket = io.connect('http://'+config.hostname+':'+config.webport);

socket.on('connect', function() {
	console.log('Connected to the server.');
  socket.emit('becometurret', config.secret);
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
    console.log("[tx] ", cmd);
    if (arduinoopen !== false) {
      arduino.write(data+"\n", function() {});
    }
  }
});

/*
    
  this.sendarduino = function(data) {
  }
  
*/