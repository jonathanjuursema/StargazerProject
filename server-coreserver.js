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

module.exports = function() {
  
  /* Server variable initialization */
  
  // Shorthand
  var s = this;
  // Global Stellarium server
  var stellarium;
    // Server mode: 0 (off), 1 (tracking ISS), 2 (tracking Stellarium object)
  var servermode;  
  // Tracking target. Is only used when mode=2, but can be set when another mode is active.
  var target; 
  // Tracking target altitude and azimuth.
  var targetaltaz;
  // Current orientation of the turret.
  var orientation;
  // Server GPS location.
  var location;
  // ISS location.
  var iss;
  // turret handlers.
  var turret;
  // gui handlers.
  var gui;
  // satellite list
  var satellites;
    
  /* Main functions */
  
  // Init function
  this.init = function() {
    s.safemode = false;
    s.servermode = 0;
    s.target = {'ra':0.0,'dec':0.0};
    s.targetaltaz = {'alt':0.0,'az':0.0};
    s.orientation = {'alt':0.0,'az':0.0};
    s.location = {'lat':0.0,'lon':0.0};
    s.satellite = "";
    s.satellites = [];
    setInterval(s.updategui, 250);
    setInterval(s.bursttoturret, 250);
    
    s.clients = {};
    s.turret = false;
  }
  
  // Listener
  this.listen = function() {
    
  }
  
  // Sets the server in a different mode
  this.setmode = function(newmode) {
    s.target = {'ra':0.0,'dec':0.0};
    s.targetaltaz = {'alt':0.0,'az':0.0};
    switch(newmode) {
      case 0:
        console.info("Server switching mode from "+s.servermode+" to "+newmode+".");
        s.servermode = 0;
        return true;
        
      case 1:
        console.info("Server switching mode from "+s.servermode+" to "+newmode+".");
        s.servermode = 1;
        return true;
      
      case 2:
        console.info("Server switching mode from "+s.servermode+" to "+newmode+".");
        s.servermode = 2;
        return true;
        
      default:
        console.warn("Invalid server mode ("+newmode+") - remaining in mode "+s.servermode+".");
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
        
    return true;
  }
  
  this.setlocation = function(newlocation) {
    if(!(newlocation.lat === Number(newlocation.lat) && newlocation.lat % 1 !== 0) || !(newlocation.lon === Number(newlocation.lon) && newlocation.lon % 1 !== 0)) {
      console.warn("New location ["+newlocation.lat+", "+newlocation.lon+"] are not valid. Keeping old one.");
      return false;
    }
    
    s.location.lat = newlocation.lat; s.location.lon = newlocation.lon;
    console.info("New location set to [LAT "+s.location.lat.hr()+" deg, LON "+s.location.lon.hr()+" deg].");
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
    
    var spherical = { 'ra':parseFloat(coordinates.ra), 'dec':parseFloat(coordinates.dec) }
    
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
  
  this.updategui = function() {
    var clients = [];

    for (id in s.clients) {
      client = s.clients[id];
      clients.push({'id':client.id, 'addr':client.handshake.address, 'admin':(client.sockettype == 'admin' ? true : false), 'turret':(client.sockettype == 'turret' ? true : false)});
    }
    
    var d = new Date(); // current time
    var m = d.getTime(); // ms since unix epoch UTC
       
    for (id in s.clients) {
      client = s.clients[id];
      client.emit('update', {
        'safemode': s.safemode,
        'servermode': s.servermode,
        'target': s.target,
        'targetaltaz': s.targetaltaz,
        'orientation': s.orientation,
        'location': s.location,
        'satellite': s.satellite,
        'satellites': s.satellites,
        'admin': (client.sockettype == 'admin' ? true : false),
        'clients': clients,
        'time': m
      });
    }
  }
        
  this.bursttoturret = function() {
    
    var a, d;
      
    if (s.servermode == 0) {
      d = 0;
      a = 0;
      s.targetaltaz = {'alt':0,'az':0};
      s.target = {'ra':0,'dec':0};
    } else if (s.servermode == 1) {
      d = s.targetaltaz.az;
      a = s.targetaltaz.alt;
    } else if (s.servermode == 2) {
      var c = s.calculatesphericalcoordinates(s.target);
      d = c.az;
      a = c.alt;
      s.targetaltaz = c;
    }
    
    if (s.safemode != false) {
      if (a < 90) {
        a = 90;
      }
    }
     
    if (s.turret !== false) {
      
      s.turret.emit('target',{'az':d, 'alt':a});
                  
    }
    
  }
  
  this.init();
  
}