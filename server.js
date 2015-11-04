/* Loading required dependencies. */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var socketio = require('socket.io')(http);
var spi;
var stellariumservermodule = require('./stellarium.js');
var sys = require('sys')
var exec = require('child_process').exec;
var httpalt = require('http');
var fs = require('fs');

// Usefull functions 
Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};
Number.prototype.torad = function() {
    return this * Math.PI / 180;
};
Number.prototype.todeg = function() {
    return this * 180 / Math.PI;
};
Number.prototype.hr = function() {
    return this.toFixed(3);
};

var flagset = function(flag) {  
  for (i = 0; i < process.argv.length; i++) {
    if (process.argv[i] == "--"+flag) {
      return true;
    }
  }
  return false;
}

/* Starting core server. */

var coreserver = function() {
  
  /* Server variable initialization */
  
  // Shorthand
  var s = this;
  // Global Stellarium server
  var stellarium;
    // Server mode: 0 (off), 1 (tracking ISS), 2 (tracking Stellarium object)
  var servermode;  
  // Tracking target. Is only used when mode=2, but can be set when another mode is active.
  var target;
  // Current turret direction.
  var direction;
  // Server GPS location.
  var location;
  // ISS location.
  var iss;
    
  /* Main functions */
  
  // Init function
  this.init = function() {
    s.servermode = 0;
    s.target = {'ra':0.0,'dec':0.0};
    s.direction = {'ra':0.0,'dec':0.0};
    s.location = {'lat':0.0,'lon':0.0};
    s.iss = {'alt':0.0,'az':0.0};
    s.satellite = "";
    setInterval(s.bursttosoc, 100);
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
    newcoordinates = s.convertstellariumcoordinates(newcoordinates);
    
    if(!(newcoordinates.ra === Number(newcoordinates.ra) && newcoordinates.ra % 1 !== 0) || !(newcoordinates.dec === Number(newcoordinates.dec) && newcoordinates.dec % 1 !== 0)) {
      console.warn("New target coordinates ["+newcoordinates.ra+", "+newcoordinates.dec+"] are not valid. Keeping old ones.");
      return false;
    }
        
    s.target.ra = newcoordinates.ra; s.target.dec = newcoordinates.dec;
    console.info("New target set to [RA "+s.target.ra.hr()+" hrs, DEC "+s.target.dec.hr()+" deg].");
    sendgui('message',{'text': 'A new target has been selected on the following celestial coordinates: RA '+s.target.ra.hr()+', DEC '+s.target.dec.hr()+'.'});
        
    return true;
  }
  
  this.setlocation = function(newlocation) {
    if(!(newlocation.lat === Number(newlocation.lat) && newlocation.lat % 1 !== 0) || !(newlocation.lon === Number(newlocation.lon) && newlocation.lon % 1 !== 0)) {
      console.warn("New location ["+newlocation.lat+", "+newlocation.lon+"] are not valid. Keeping old one.");
      sendgui('message',{'text': "Recevied invalid coordinates ["+newlocation.lat+", "+newlocation.lon+"], keeping old ones."});
      return false;
    }
    
    s.location.lat = newlocation.lat; s.location.lon = newlocation.lon;
    console.info("New location set to [LAT "+s.location.lat.hr()+" deg, LON "+s.location.lon.hr()+" deg].");
    sendgui('message',{'text': "New server location has been set to ["+s.location.lat.hr()+", "+s.location.lon.hr()+"]."});
    return true;
  }
  
  this.getj2000date = function() {
    // J2000 calculation comes from http://jtauber.github.io/mars-clock/
    var d = new Date(); // current time
    var m = d.getTime(); // ms since unix epoch UTC
    var jdut = 2440587.5 + (m / 86400000); // julian date (see site)
    var jdtt = jdut + ((35+32.184) / 86400); // julian date accounting for leap seconds (see site)
    var j2000 = jdtt - 2451545; // conversion to J2000 date! yay! (see site)
    return j2000;
  }
  
  this.getj2000hour = function() {
    var d = new Date(), h = d.getUTCHours(), m = d.getUTCMinutes(), s = d.getUTCSeconds(), u = d.getUTCMilliseconds();
    return (h + (m/60) + (s/3600) + (u/(3600*1000)));
  }
  
  this.convertstellariumcoordinates = function(coordinates) {
    coordinates.ra = ((coordinates.ra / (2*Math.PI)) * 24);
    
    coordinates.dec = ((coordinates.dec / (2*Math.PI)) * 360);
    coordinates.dec = (coordinates.dec > 180 ? (coordinates.dec - 360) : coordinates.dec);
    
    return coordinates;
  }
  
  this.calculatesphericalcoordinates = function(coordinates) {
    
    var spherical = { 'ra':coordinates.ra, 'dec':coordinates.dec }
    
    if (s.location.lat == 0.0 && s.location.lon == 0.0) {
      spherical.alt = 0.0;
      spherical.az = 0.0;
      return spherical;
    }
    
    var d = new Date();
    
    // calculation comes from http://www.stargazing.net/kepler/altaz.html
    spherical.ra = spherical.ra * (360/24); // convert from hours to degrees
    spherical.lst = ( 100.46 + 0.985647 * s.getj2000date() + s.location.lon + ( 15 * s.getj2000hour() ) ); // get local siderial time (see site)
    spherical.lst = spherical.lst.mod(360);
    spherical.ha = ( spherical.lst - spherical.ra ); // get hour angle
    spherical.ha = spherical.ha.mod(360);
    
    spherical.sinalt = Math.sin(spherical.dec.torad()) * Math.sin(s.location.lat.torad()) + Math.cos(spherical.dec.torad()) * Math.cos(s.location.lat.torad()) * Math.cos(spherical.ha.torad());
    spherical.alt = Math.asin(spherical.sinalt);
    spherical.cosaz = ( Math.sin(spherical.dec.torad()) - Math.sin(spherical.alt) * Math.sin(s.location.lat.torad()) ) / ( Math.cos(spherical.alt) * Math.cos(s.location.lat.torad()) );
    spherical.az = Math.acos(spherical.cosaz);
    
    spherical.alt = spherical.alt.todeg() + 90;
    if (Math.sin(spherical.ha.torad()) >= 0) {
      spherical.az = 360 - spherical.az.todeg();
    } else {
      spherical.az = spherical.az.todeg();
    }
    
    return spherical;
    
  }
      
  this.bursttosoc = function() {
  
    if (soc !== false) {
      
      var startword = 0x7FFFFFFE; // arbitrarily chosen, but out of the reach of the data: (+360 deg, 0x15752A00; -360 deg, 0xEA8AD600)
      var endword = 0x7FFFFFFF;
      
      var c = s.calculatesphericalcoordinates(s.target);
      
      /* Everything is multiplied by 2^17 to make casting on the FPGA much easier*/
      if (s.servermode == 0) {
        s.sendsoc( startword );
        s.sendsoc( Math.round(0.0 * 131072) );
        s.sendsoc( Math.round(0.0 * 131072) );
        s.sendsoc( endword );
      } else if (s.servermode == 1) {
        s.sendsoc( startword );
        s.sendsoc( Math.round(s.iss.alt * 131072) );
        s.sendsoc( Math.round(s.iss.az * 131072) );
        s.sendsoc( endword );
      } else if (s.servermode == 2) {
        s.sendsoc( startword );
        s.sendsoc( Math.round(c.alt * 131072) );
        s.sendsoc( Math.round(c.az * 131072) );
        s.sendsoc( endword );
      }
                  
    }
    
  }
  
  this.debugthroughput = flagset("debugthroughput");
  
  this.sendsoc = function(data) {
    
    if (soc !== false) {
      
      var txbuf = new Buffer(4);
      var rxbuf = new Buffer(4);
      
      txbuf.writeInt32BE(data);
            
      soc.transfer(txbuf, rxbuf, function(device, buf) {});
      
      if (s.debugthroughput) {
        console.log("[tx]", txbuf, "[rx]", rxbuf, "[parsed]", (txbuf.readInt32BE(0) / 131072).hr(), " | ", (rxbuf.readInt32BE(0) / 131072).hr())
      }
    }
    
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
  
  var interval = setInterval(function() {
    stellariumserverinstance.write(server.direction);
  }, 500);

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
  
  socket.on('setsatellite', function(data) {
    console.log("Now tracking satellite "+data+".");
    server.satellite = data;
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
  
  if (flagset("nospi")) {
    console.info("SPI interface not loaded on user request.");
    return;
  }
  
  spi = require('spi');
  
  soc = new spi.Spi('/dev/spidev0.0', {'chipSelect': spi.CS['none'], 'mode': spi.MODE['MODE_2'], 'maxSpeed': 1000000, 'bitOrder': false}, function(s){s.open();});
  
  console.info("SPI interface loaded.");
  
}

initspi();

/* Fetching ISS coordinates. */

var satellites;

setInterval(function() {
  if (server.servermode == 1) {
    
    exec("python ./sat.py --lat="+server.location.lat+" --lon="+server.location.lon+" --sat=\""+server.satellite+"\" --alt", parsealt);
    
    function parsealt(error, stdout, stderr) {
      server.iss.alt = (stdout*1)+90;
    }
    
    exec("python ./sat.py --lat="+server.location.lat+" --lon="+server.location.lon+" --sat=\""+server.satellite+"\" --az", parseaz);
    
    function parseaz(error, stdout, stderr) {
      server.iss.az = stdout;
    }

  }   
  
  exec("python ./sat.py --list", parselist);
  
  function parselist(error, stdout, stderr) {
    satellites = stdout.split(/\n/);
    sendgui("satellites",satellites);
  }
    
}, 1000);

var readtelemetry = function() {
  var file = fs.createWriteStream("./satellites.dat");
  var request = httpalt.get("http://www.celestrak.com/NORAD/elements/stations.txt", function(response) {
    response.pipe(file);
  });
  console.log("Read telemetry data for satellites.");
}

// Read new telemetry data every hour.
setInterval(readtelemetry, 3600*1000);
readtelemetry();