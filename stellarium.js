/* This file is an adaptation of 
      https://github.com/fcsonline/node-telescope-server/blob/master/servers/stellarium.js

    The LICENSE is not applicable to this file. This file is licensed under the same LICENSE as the fcsonline/node-telescope-server project.
*/

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var net = require('net');
var microtime = require('node-telescope-server/node_modules/microtime');
var utils = require('node-telescope-server/utils');
var ExponentialBuffer = require('node-telescope-server/lib/exponential.buffers');

function Server(params) {

  var self = this;

  this.listen = function () {

    // Start a TCP Server
    net.createServer(function (socket) {

      var interval
        , current_position
        , desired_position;

      current_position = desired_position = {
        x: 0.0
      , y: 0.0
      , z: 0.0

      , ra_int: 0
      , dec_int: 0
      };

      // Identify this client
      console.log('\nNew incoming connection from ' + socket.remoteAddress + ":" + socket.remotePort);

      // New incoming data from Stellarium, process it and send emit the event to the telescope
      socket.on('data', function (raw) {
        var command = self.read(raw);
        
        desired_position = {
          x: Math.cos(command.ra) * command.cdec
        , y: Math.sin(command.ra) * command.cdec
        , z: Math.sin(command.dec)
        };

        self.emit('goto', {
          ra: command.ra
        , dec: command.dec
        });

      });

      socket.on('end', function () {
        if (!params.quiet) {
          console.log("Connection with Stellarium closed!");
        }
      });

    }).listen(params.port);

    console.log(utils.welcome(params));
  };

  this.track = function (position) {
    // Nothing to Do
  };

  function lshift(num, bits) {
    return num * Math.pow(2, bits);
  }

  function rshift(num, bits) {
    return num * Math.pow(2, -bits);
  }

  this.read = function (raw) {
    var ibuffer = new ExponentialBuffer(raw)
      , length
      , type
      , time
      , ra_int
      , dec_int

      , ra
      , dec
      , cdec;

    if (params.debug) {
      console.log('Input: ', ibuffer);
    }

    length  = ibuffer.readUInt16LE(0);
    type    = ibuffer.readUInt16LE(2);
    time    = ibuffer.readDoubleExponential(4);
    ra_int  = ibuffer.readUInt32LE(12);
    dec_int = ibuffer.readUInt32LE(16);

    ra = ra_int * (Math.PI / 0x80000000);
    dec = dec_int * (Math.PI / 0x80000000);
    cdec = Math.cos(dec);

    return {
      ra: ra
    , dec: dec
    , ra_int: ra_int
    , dec_int: dec_int
    , cdec: cdec
    };
  };

  this.write = function (position) {
    
    var position = position;

    var obuffer = new ExponentialBuffer(24)
      , time = microtime.now()
      , h
      , ra
      , ra_int
      , dec
      , dec_int;

    ra  = position.ra;
    dec = position.dec;

    ra_int = Math.abs(Math.floor(0.5 + ra * (0x80000000 / Math.PI)));
    dec_int = Math.floor(0.5 + dec * (0x80000000 / Math.PI));

    obuffer.writeUInt16LE(obuffer.length, 0);
    obuffer.writeUInt16LE(0, 2);
    obuffer.writeDoubleExponential(time, 4);
    obuffer.writeUInt32LE(ra_int, 12);
    obuffer.writeInt32LE(dec_int, 16);
    obuffer.writeUInt32LE(0, 20);

    if (params.debug) {
      console.log('Output: ', obuffer);
    }

    return obuffer;
  };

}

util.inherits(Server, EventEmitter);

module.exports = Server;
