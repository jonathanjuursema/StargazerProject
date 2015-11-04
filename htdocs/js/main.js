var socket = io();

$(document).ready(function() {
	
	// Set everything to invisible untill we recieve an init message from socket.io
	$('.button-row').hide(0);
	spawnDisconnectedMessage('Connecting to server...', 'blue');

	// Hide message
	$('.mesg-panel').hide();

	var classes = ['Satalite A', 'Satalite B' , 'Satalite C', 'ISS'];


	$.each(classes, function(i, v) {
		var link = '#!';
		$('#dropdown').append('<li><a href="' + link + '" class="' + 'iss' + '">' + v + '</a></li>');
	});

	$('.iss').click(function(event) {
		setMode(1);
		// Get setalite
		var setalite = 'iss';
		socket.emit('setsetalite', satalite);
	});
});

// Buttons
$('.sendLoc').click(function(event) {
	getLocation();
});

$('.stellarium').click(function(event){
	setMode(2);
});

$('.power-button').click(function(event) {
	setMode(0);
});

$('.dropdown-button').dropdown({
	inDuration: 300,
	outDuration: 225,
	constrain_width: false, // Does not change width of dropdown to that of the activator
	hover: false, // Activate on hover
	gutter: 0, // Spacing from edge
	belowOrigin: false, // Displays dropdown below the button
	alignment: 'left' // Displays dropdown with edge aligned to the left of button
});

function setMode(mode) {

	console.log("Setting mode to: " + mode);

	var classes = ['red', 'green' ,'blue'];

	$.each(classes, function(i, v) {
		$('.stellarium').removeClass(v);
		$('#dropdown').removeClass(v);
		$('.power-button').removeClass(v);
	});

	// Toggle buttons
	switch (mode) {
		case 0:
			$('.power-button').addClass('red');
			$('.stellarium').addClass('blue');
			$('#dropdown').addClass('blue');
			spawnMessagePanel('Now standing by', 'green');
		break;
		case 1:
			$('.power-button').addClass('blue');
			$('.stellarium').addClass('blue');
			$('#dropdown').addClass('green');
			spawnMessagePanel('Now using Stellarium', 'green');
		break;
		case 2:
			$('.power-button').addClass('blue');
			$('.stellarium').addClass('green');
			$('#dropdown').addClass('blue');
			spawnMessagePanel('Now tracking ISS', 'green');
		break;
		default:
			// Error?
		break;
	}
	// Emit socket event
	socket.emit('setmode', {mode: mode});
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
});

socket.on('init', function(data) {
	mode = data.mode;
	setMode(mode);
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

socket.on('satalites', function(data) {
	// Array of satalites
	console.log(data);
});