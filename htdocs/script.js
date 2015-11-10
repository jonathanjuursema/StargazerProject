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
  
  $("#toggle_safemode").click(function() {
    socket.emit('safemode', {});
  });
  $("#toggle_standby").click(function() {
    socket.emit('setmode', 0);
  });
  $("#toggle_stellarium").click(function() {
    socket.emit('setmode', 2);
  });
  $("#satlist").on("click", ".select_sat", function() {
    var sat = $(this).attr('data-sat');
    socket.emit('setsatellite', sat);
    socket.emit('setmode', 1);
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
	$('#servertime').removeClass('disabled');
	$('#connecting').hide(500);
  setTimeout(updatesatlist, 1000);
});

socket.on('disconnect', function(err){
	$('#controls').addClass('disabled');
	$('#clients-container').addClass('disabled');
	$('#servertime').addClass('disabled');
	$('#connecting').show(500);
});

socket.on('update', function(data) {
	serverdata = data;
  
  $("#target-ra").html(parseFloat(data.target.ra/360*24).toFixed(3));
  $("#target-dec").html(parseFloat(data.target.dec).toFixed(3));
  $("#target-alt").html(parseFloat(data.targetaltaz.alt-90).toFixed(3));
  $("#target-az").html(parseFloat(data.targetaltaz.az).toFixed(3));
  $("#current-alt").html(parseFloat(data.orientation.alt-90).toFixed(3));
  $("#current-az").html(parseFloat(data.orientation.az).toFixed(3));
  $("#current-lat").html(parseFloat(data.location.lat).toFixed(3));
  $("#current-lon").html(parseFloat(data.location.lon).toFixed(3));
  
  switch(serverdata.servermode) {
    case 0: 
      $("#toggle_standby").removeClass("grey red-text").addClass("red grey-text");
      $("#toggle_stellarium").addClass("grey red-text").removeClass("red grey-text");
      $(".setsat").addClass("grey red-text").removeClass("red grey-text");
      break;
    
    case 1:
      $("#toggle_standby").addClass("grey red-text").removeClass("red grey-text");
      $("#toggle_stellarium").addClass("grey red-text").removeClass("red grey-text");
      break;
      
    case 2:
      $("#toggle_standby").addClass("grey red-text").removeClass("red grey-text");
      $("#toggle_stellarium").removeClass("grey red-text").addClass("red grey-text");
      $(".setsat").addClass("grey red-text").removeClass("red grey-text");
      break;
  }
  
  if (serverdata.admin) {
    $('#become-admin').hide(500);
    $('.admin-button').removeClass('hidden');
    $('.select_sat').removeClass('hidden');
  } else {
    $('#become-admin').show(500);
    $('.admin-button').addClass('hidden');
    $('.select_sat').addClass('hidden');
  }
  
  $("#clients").html("");
  for (i in serverdata.clients) {
    var c = serverdata.clients[i];
    $("#clients").append('\
      <div class="chip grey darken-4 red-text text-darken-4" style="margin-right: 15px;">\
        <i class="material-icons circle">'+(c.admin ? 'verified_user' : (c.turret ? 'settings_input_antenna' : 'perm_identity'))+'</i>\
        '+c.addr+'\
      </div><br>\
    ');
  }
  
  $(".select_sat").each(function() {
    if ($(this).attr('data-sat') == serverdata.satellite && serverdata.servermode == 1) {
      $(this).removeClass("grey red-text").addClass("red grey-text");
    } else {
      $(this).addClass("grey red-text").removeClass("red grey-text");
    }
  });
  
  var st = new Date(serverdata.time);
  var lt = new Date();
  $("#servertime").html(pad(st.getHours(),2)+":"+pad(st.getMinutes(),2)+":"+pad(st.getSeconds(),2));
  $("#localtime").html(pad(lt.getHours(),2)+":"+pad(lt.getMinutes(),2)+":"+pad(lt.getSeconds(),2));
  $("#timediff").html((lt.getTime()-st.getTime())/1000+"s");
  
  if (serverdata.safemode) {
    $("#toggle_safemode").removeClass("grey red-text").addClass("red grey-text");
  } else {
    $("#toggle_safemode").addClass("grey red-text").removeClass("red grey-text");
  }
  
});

var satlistiterator = 0;
function updatesatlist() {
  $("#satlist").html("");
  for (i in serverdata.satellites) {
    if (serverdata.satellites[i] != "" && serverdata.satellites[i].indexOf("SAT") < 0 && serverdata.satellites[i].indexOf("FLOCK") < 0) { 
      $("#satlist").append('\
        <p>\
          <a class="select_sat red-text text-darken-4 waves-effect waves-red btn darken-4 grey invisible" style="display: block" data-sat="'+serverdata.satellites[i]+'">'+serverdata.satellites[i]+'</a>\
        </p>\
      ');
    }
  }
  satlistiterator = 0;
  setTimeout(activatesatlist, 500);
}
function activatesatlist() {
  $(".select_sat:eq("+satlistiterator+")").removeClass("invisible");
  satlistiterator++;
  setTimeout(activatesatlist, 100);
}

Number.prototype.hr = function() {
    return this.toFixed(3);
};
function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}