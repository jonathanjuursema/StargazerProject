var socket = io();

$(document).ready(function() {
	
	// Set everything to invisible untill we recieve an init message from socket.io
	$('.button-row').hide(0);
	spawnDisconnectedMessage('Connecting to server...', 'blue');

	setMode($('.trackISS'), mode);

	// Hide message
	$('.mesg-panel').hide();
});

// Buttons
$('.sendLoc').click(function(event) {
	getLocation();
});

var mode = 0;
$('.trackISS').click(function(event) {
	
	(mode == 1)? mode = 2 : mode = 1;
	console.log("Setting mode to: " + mode);

	setMode(this, mode);

	// Send socket
	socket.emit('setmode', {mode: mode});
});

$('.calibrate').click(function(event) {
	socket.emit('calibrate');
	spawnMessagePanel('Calibrating...', 'blue');
});

$('.power-button').click(function(event) {
	// Sets the mode of the stargazer turret to zero
	mode = 0;
	socket.emit('setmode', {mode: mode});
	spawnMessagePanel('Shutting down Stargazer...', 'red');
});

function setMode(element, mode) {
	// toggle colors between red and green
	if (mode == 1) {
		$(element).removeClass('red');
		$(element).addClass('light-green');
		$(element).html('<i class="material-icons left">my_location</i>track ISS');
		// Send gui message
		spawnMessagePanel('Now tracking ISS', 'green');
	} else {
		$(element).removeClass('light-green');
		$(element).addClass('red');
		$(element).html('<i class="material-icons left">my_location</i>using stellarium');
		// Send gui message
		spawnMessagePanel('Now using Stellarium', 'green');
	}
}

// Asks the browser for a location
function getLocation() {

	if (!("geolocation" in navigator)) {
		// Send gui message
		spawnMessagePanel('Oeps, it seems location tracking is not available right now.', 'red');
		return "ERROR(): Not Supported";
	}

	// Call Nav API
	navigator.geolocation.getCurrentPosition(
		function(position) {
			var lat = position.coords.latitude;
			var lon = position.coords.longitude;

			// User feedback
			console.log({lat: lat, lon: lon});
			spawnMessagePanel("Now sending coordinates...", 'green');
			
			socket.emit('setlocation', {lat: lat, lon: lon});
		}, 
		function(err) {
			// User feedback
			spawnMessagePanel('Oeps, something went wrong.' + '</br>' + 'ERROR(' + err.code + '): ' + err.message, 'red');
			return 'ERROR(' + err.code + '): ' + err.message;
		}, 
			{
				enableHighAccuracy: true,
				timeout: 5000,
				maximumAge: 0
			}
		);
}

function spawnMessagePanel(message, color) {
	
	var node = $(
		'<div class="row mesg-panel"><div class="col s12 m8 offset-m2"><div class="card-panel center-align ' + 
		color + 
		' " darken-4 white-text">' + 
		message + 
		'</div></div></div>'
		);
	node.slideUp(0);
	$('.message-queue').after(node);
	$('.mesg-panel').hide().slideDown(300).delay(1000).slideUp(300, function() {
		$(this).remove();
	});
}

function spawnDisconnectedMessage(message, color) {
	
	// Create new node

	var node = $(
		'<div class="row mesg-panel err-msg"><div class="col s12 m8 offset-m2"><div class="card-panel center-align ' + 
		color + 
		' " darken-4 white-text">' + 
		message + 
		'<div class="progress"><div class="indeterminate"></div></div></div></div></div>'
		);

	$('.message-queue').after(node);
	$('.mesg-panel').hide().slideDown(300);
}

socket.on('disconnect', function(err){
	$('.button-row').hide(0);
	spawnDisconnectedMessage('Server disconnected, trying to reconnect...', 'red');
});

socket.on('connect', function() {
	$('.err-msg').remove();
});

socket.on('message', function(data) {
	console.log(data.text);
	//spawnMessagePanel(data.text, 'blue');
});

socket.on('init', function(data) {
	mode = data.mode;
	setMode(mode);
	// Activate button row
	console.log("Server connected.");
	spawnMessagePanel('Server connected...', 'green');
	$('.button-row').show(500);
});

socket.on('setmode', function(data) {
	// Mode set
	// 0 out
	// 1 track iss
	// 2 stellarium
	// get the mode that it would have been if error
	console.log("Mode set to: " + data.mode);
});