/* Loading required dependencies. */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var socketio = require('socket.io')(http);
var spi;
var stellariumservermodule = require('./stellarium.js');

/* Starting core server. */

var coreserver = function(params) {
  
  /* Server variable initialization */
  
  // Shorthand
  var s = this;
  // Global Stellarium server
  var stellarium;
    // Server mode: 0 (off), 1 (tracking ISS), 2 (tracking Stellarium object)
  var servermode;  
  // Tracking target. Is only used when mode=2, but can be set when another mode is active.
  var target;
  // Server GPS location.
  var location;
  // ISS location.
  var isslocation;
  
  /* Main functions */
  
  // Init function
  this.init = function() {
    s.servermode = 0;
    s.target = {'ra':0.0,'dec':0.0};
    s.location = {'lat':0.0,'lon':0.0};
    s.isslocation = {'lat':0.0,'lon':0.0};
  }
  
  // Listener
  this.listen = function() {
    
  }
  
  // Sets the server in a different mode
  this.setmode = function(newmode) {
    switch(newmode) {
      case 0:
        console.info("Server switching mode from "+s.servermode+" to "+newmode+".");
        sendgui('setmode',{'mode':0,'text':'Mode changed to off.'});
        s.servermode = 0;
        return true;
        
      case 1:
        console.info("Server switching mode from "+s.servermode+" to "+newmode+".");
        sendgui('setmode',{'mode':1,'text':'Mode changed to track ISS.'});
        s.servermode = 1;
        return true;
      
      case 2:
        console.info("Server switching mode from "+s.servermode+" to "+newmode+".");
        sendgui('setmode',{'mode':2,'text':'Mode changed to track Stellarium object.'});
        s.servermode = 2;
        return true;
        
      default:
        console.warn("Invalid server mode ("+newmode+") - remaining in mode "+s.servermode+".");
        sendgui('setmode',{'mode':s.servermode,'text':'Invalid mode.'});
        return false;
    }
  }
  
  // Sets new target coordinates for the server
  this.settarget = function(newcoordinates) {
    newcoordinates.ra = s.convertstellariumcoordinates(newcoordinates.ra);
    newcoordinates.dec = s.convertstellariumcoordinates(newcoordinates.dec);
    
    if(!(newcoordinates.ra === Number(newcoordinates.ra) && newcoordinates.ra % 1 !== 0) || !(newcoordinates.dec === Number(newcoordinates.dec) && newcoordinates.dec % 1 !== 0)) {
      console.warn("New target coordinates ["+newcoordinates.ra+", "+newcoordinates.dec+"] are not valid. Keeping old ones.");
      return false;
    }
    
    s.target.ra = newcoordinates.ra; s.target.dec = newcoordinates.dec;
    console.info("New target set to [RA "+s.target.ra+", DEC "+s.target.dec+"].");
    sendgui('message',{'text': 'A new target has been selected on the following celestial coordinates: RA '+s.target.ra+', DEC '+s.target.dec+'.'});
    return true;
  }
  
  this.setlocation = function(newlocation) {
    if(!(newlocation.lat === Number(newlocation.lat) && newlocation.lat % 1 !== 0) || !(newlocation.lon === Number(newlocation.lon) && newlocation.lon % 1 !== 0)) {
      console.warn("New location ["+newlocation.lat+", "+newlocation.lon+"] are not valid. Keeping old one.");
      sendgui('message',{'text': "Recevied invalid coordinates ["+newlocation.lat+", "+newlocation.lon+"], keeping old ones."});
      return false;
    }
    
    s.location.lat = newlocation.lat; s.location.lon = newlocation.lon;
    console.info("New locaiton set to ["+s.location.lat+", "+s.location.lon+"].");
    sendgui('message',{'text': "New server location has been set to ["+s.location.lat+", "+s.location.lon+"]."});
    return true;
  }
  
  this.convertstellariumcoordinates = function(coordinate) {
    coordinate = ((coordinate / (2*Math.PI)) * 360);
    return (coordinate > 180 ? (coordinate - 360) : coordinate);
  }
  
  this.init();
  
}

var server = new coreserver();

/* Starting Stellarium server. */

var stellariumserver = function(params) {
  var stellariumserverinstance = new stellariumservermodule(params);

  // This intercepts the input of Stellarium, sending it along to our core server.
  stellariumserverinstance.on('goto', function (position) {
    server.settarget(position);
  });

  /* This is going to be used to handle the feedback from the gimble, sending current direction vector back to Stellarium.
  laser.on('track', function (position) {
    stellariumserverinstance.track(position);
  });
  */

  stellariumserverinstance.listen();

  return stellariumserverinstance;
}

var stellarium = new stellariumserver({
      port: 5050,
      debug: false,
      quiet: true,
      type: 'Stellarium',
      telescopeType: 'Stargazer'
});

/* Starting webserver */

app.use(express.static('htdocs'));
http.listen(process.env.PORT || 5000);

/* Handling Socket.IO throughput */

var gui = false;

socketio.on('connection', function(socket) {
  
  if (gui === false) {
    gui = socket;
    console.info("New incoming GUI connection from "+socket.handshake.address+".");
    gui.emit('init', {'location':server.location,'target':server.target,'mode':server.servermode});
  } else {
    console.info("New incoming GUI connection from "+socket.handshake.address+", but we're already busy.");
    socket.emit('message', {'text':'This server is already occupied. Please try again later.'});
    socket.disconnect();
    gui.emit('message', {'text':'Another client tried to connect to our server from '+socket.handshake.address+'.'});
  }
  
  socket.on('setmode', function(data) {
    server.setmode(data.mode);    
  });
  
  socket.on('setlocation', function(data) {
    server.setlocation(data);
  });
  
  socket.on('disconnect', function() {
    console.info("Client "+socket.handshake.address+" disconnected.");
    socket.emit('message', {'text':'Disconnecting...'});
    gui = false;
  });
  
});

function sendgui(event, data) {
  if (gui !== false) {
    gui.emit(event, data);
  }
}

/* Establishing SPI connection */

var soc = false;

function initspi() {
  
  for (i = 0; i < process.argv.length; i++) {
    if (process.argv[i] == "--nospi") {
      console.info("SPI interface not loaded.");
      return;
    }
  }
  
  spi = require('spi');
  
  soc = new spi.Spi('/dev/spidev0.0', {'chipSelect': spi.CS['none'], 'mode': spi.MODE['MODE_2'], 'maxSpeed': 1000000, 'bitOrder': false}, function(s){s.open();});
  
  console.info("SPI interface loaded.");

  setInterval(function() {
    soc.transfer(new Buffer([ 0x00 ]), new Buffer([ 0x00 ]), function(dev, buf) {
      setTimeout(function() {
        soc.transfer(new Buffer([ 0x11 ]), new Buffer([ 0x00 ]), function(dev, buf) {
        });
      }, 500);
    });
  }, 1000);
  
}

initspi();

/* Fetching ISS coordinates. */

setInterval(function() {
  if (server.servermode == 1) {
    require('http').get("http://api.open-notify.org/iss-now.json", function(res){
      var body = '';

      res.on('data', function(chunk){
          body += chunk;
      });

      res.on('end', function(){
          var response = JSON.parse(body);
          console.log("Got these GPS coordinates: ", response.iss_position);
          server.isslocation.lat = response.iss_position.latitude;
          server.isslocation.lon = response.iss_position.longitude;
          
      });
    }).on('error', function(e){
          console.warn("Got an error during scraping of ISS location: ", e);
    });
  }
}, 1000);
