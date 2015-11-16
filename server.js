/* This program should be run on a server that is always available and publicly reachable. Can also be run on the turret itself, but this complicates reaching the turret if

/* Loading required dependencies. */
var config = require("./config.js");
var express = require('express');
var app = express();
var http = require('http').Server(app);
var socketio = require('socket.io')(http);
var spi;
var stellariumservermodule = require('./stellarium.js');
var sys = require('sys')
var exec = require('child_process').exec;
var fs = require('fs');

/* Starting core server. */

var coreserver = require('./server-coreserver.js');

var server = new coreserver();

/* Starting Stellarium server. */

var stellariumserver = function(params) {
  var stellariumserverinstance = new stellariumservermodule(params);

  // This intercepts the input of Stellarium, sending it along to our core server.
  stellariumserverinstance.on('goto', function (position) {
    server.settarget(position);
  });
  
  var interval = setInterval(function() {
    //stellariumserverinstance.write(server.direction);
  }, 250);

  stellariumserverinstance.listen();

  return stellariumserverinstance;
}

var stellarium = new stellariumserver({
      port: config.stellariumport,
      debug: false,
      quiet: true,
      type: 'Stellarium',
      telescopeType: 'Stargazer'
});

/* Starting webserver */

app.use(express.static('htdocs'));
http.listen(process.env.PORT || config.webport);

/* Handling Socket.IO throughput */

socketio.on('connection', function(socket) {
  
  
  server.clients[socket.id] = socket;
  socket.sockettype = 'gui';  
  
  console.info("New incoming GUI connection from "+socket.handshake.address+".");
    
  socket.on('safemode', function(data) {
    if (socket.sockettype == 'admin') {
      server.safemode = !server.safemode;
      console.log("Toggled safemode. Now: "+server.safemode);
    }
  });
    
  socket.on('setmode', function(data) {
    if (socket.sockettype == 'admin') {
      server.setmode(data);   
    }
  });
  
  socket.on('setlocation', function(data) {
    if (socket.sockettype == 'admin') {
      server.setlocation(data);
    }
  });
  
  socket.on('setsatellite', function(data) {
    if (socket.sockettype == 'admin') {
      console.log("Now tracking satellite "+data+".");
      server.satellite = data;
    }
  });
  
  socket.on('setorientation', function(data) {
    if (socket.sockettype == 'turret') {
      server.orientation = data;
    }
  });
  
  socket.on('becomeadmin', function(data) { 
    if (data == config.password) {
      socket.sockettype = 'admin';
      console.log(socket.handshake.address+" promoted to admin.");
    }
  });
  
  socket.on('becometurret', function(data) {
      if (data == config.secret) {
        socket.sockettype = 'turret';
        socket.emit('turret', true);
        if (server.turret !== false) {
          server.turret.disconnect();
        }
        server.turret = socket;
      }
  });
  
  socket.on('disconnect', function() {
    console.info("Client "+socket.handshake.address+" disconnected.");
    delete server.clients[socket.id];
  });
  
});

/* Fetching ISS coordinates. */

setInterval(function() {
  if (server.servermode == 1) {
    
    exec("python ./sat.py --lat="+server.location.lat+" --lon="+server.location.lon+" --sat=\""+server.satellite+"\" --alt", parsealt);
    
    function parsealt(error, stdout, stderr) {
      server.targetaltaz.alt = (stdout*1)+90;
    }
    
    exec("python ./sat.py --lat="+server.location.lat+" --lon="+server.location.lon+" --sat=\""+server.satellite+"\" --az", parseaz);
    
    function parseaz(error, stdout, stderr) {
      server.targetaltaz.az = stdout;
    }
    
    exec("python ./sat.py --lat="+server.location.lat+" --lon="+server.location.lon+" --sat=\""+server.satellite+"\" --ra", parsera);
    
    function parsera(error, stdout, stderr) {
      server.target.ra = stdout;
    }
    
    exec("python ./sat.py --lat="+server.location.lat+" --lon="+server.location.lon+" --sat=\""+server.satellite+"\" --dec", parsedec);
    
    function parsedec(error, stdout, stderr) {
      server.target.dec = stdout;
    }

  }   
  
  exec("python ./sat.py --list", parselist);
  
  function parselist(error, stdout, stderr) {
    server.satellites = stdout.split(/\n/);
  }
    
}, 500);

var readtelemetry = function() {
    exec("wget --post-data='identity="+config.spacetrack.identity+"&password="+config.spacetrack.password+"&query=https://www.space-track.org/basicspacedata/query/class/tle_latest/orderby/NORAD_CAT_ID%20desc/format/3le/predicates/OBJECT_NAME,TLE_LINE1,TLE_LINE2/ORDINAL/1/NORAD_CAT_ID/25544,37820,20580,25867,40730,30794,26243,39084,00005,10953/' 'https://www.space-track.org/ajaxauth/login' -O satellites.dat", function(){console.log("Read satellite telemetry data.");});
}

// Read new telemetry data every hour.
setInterval(readtelemetry, 3600*1000);
readtelemetry();