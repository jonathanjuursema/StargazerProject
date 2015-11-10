// Use the line below if you wish to server your webpages via another webserver (hint! you can symlink your publict_html to the htdocs folder)
var socket = io.connect('http://stargazerproject.space:5000');
// Use the line below if you're hosting the webpages via the build-in express server.
// var socket = io();
var serverdata;

$(document).ready(function() {
  $("#elevate_connection").click(function() {
    var password = window.prompt("Password","");
    socket.emit('becomeadmin', password);
  });
  
  $("#toggle_standby").click(function() {
    socket.emit('setmode', 0);
  });
  $("#toggle_satellite").click(function() {
    socket.emit('setmode', 1);
  });
  $("#toggle_stellarium").click(function() {
    socket.emit('setmode', 2);
  });
  
  $("#update_location").click(function() {
    
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported in this browser.");
    }

    // Call Nav API
    navigator.geolocation.getCurrentPosition(
      function(position) {
        var lat = position.coords.latitude;
        var lon = position.coords.longitude;
        
        socket.emit('setlocation', {lat: lat, lon: lon});
      }, 
      function(err) {
        alert("Something went wrong during geolocation.");
        console.log(err);
      }, 
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    
  });
});

socket.on('connect', function() {
	$('#controls').removeClass('disabled');
	$('#clients-container').removeClass('disabled');
	$('#connecting').hide(500);
});

socket.on('disconnect', function(err){
	$('#controls').addClass('disabled');
	$('#clients-container').addClass('disabled');
	$('#connecting').show(500);
});

socket.on('update', function(data) {
	serverdata = data;
  
  $("#target-ra").html(data.target.ra);
  $("#target-dec").html(data.target.dec);
  $("#target-alt").html(data.targetaltaz.alt);
  $("#target-az").html(data.targetaltaz.az);
  $("#current-alt").html(data.orientation.alt);
  $("#current-az").html(data.orientation.az);
  $("#current-lat").html(data.location.lat);
  $("#current-lon").html(data.location.lon);
  
  switch(serverdata.servermode) {
    case 0: 
      $("#toggle_standby").removeClass("grey red-text").addClass("red grey-text");
      $("#toggle_stellarium").addClass("grey red-text").removeClass("red grey-text");
      $("#toggle_satellite").addClass("grey red-text").removeClass("red grey-text");
      break;
    
    case 1:
      $("#toggle_standby").addClass("grey red-text").removeClass("red grey-text");
      $("#toggle_stellarium").addClass("grey red-text").removeClass("red grey-text");
      $("#toggle_satellite").removeClass("grey red-text").addClass("red grey-text");    
      break;
      
    case 2:
      $("#toggle_standby").addClass("grey red-text").removeClass("red grey-text");
      $("#toggle_stellarium").removeClass("grey red-text").addClass("red grey-text");
      $("#toggle_satellite").addClass("grey red-text").removeClass("red grey-text");    
      break;
  }
  
  if (serverdata.admin) {
    $('#become-admin').hide(500);
    $('#control-buttons').show(500);
  } else {
    $('#become-admin').show(500);
    $('#control-buttons').hide(500);
  }
  
  $("#clients").html("");
  for (i in serverdata.clients) {
    var c = serverdata.clients[i];
    $("#clients").append('\
      <div class="chip grey darken-4 red-text text-darken-4" style="margin-right: 15px;">\
        <i class="material-icons circle">'+(c.admin ? 'verified_user' : (c.turret ? 'settings_input_antenna' : 'perm_identity'))+'</i>\
        '+c.addr+'\
      </div>\
    ');
  }
  
});