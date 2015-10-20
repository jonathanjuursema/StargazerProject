var socket = io();

$(document).ready(function() {
	
	// Set everything to invisible untill we recieve an init message from socket.io
	$('.button-row').hide(0);
	spawnDisconnectedMessage('Connecting to server...', 'blue');

	// Set initial color
	var $issbutton = $('a.trackISS');
	$issbutton.removeClass('red');
	$issbutton.removeClass('green');
	if (mode == 1) {
		$issbutton.addClass('green');
	} else {
		$issbutton.addClass('red');
	}

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

	// toggle colors between red and green
	if (mode == 1) {
		$(this).removeClass('red');
		$(this).addClass('green');
		// Send gui message
		spawnMessagePanel('Now tracking ISS', 'green');
	} else {
		$(this).removeClass('green');
		$(this).addClass('red');
		// Send gui message
		spawnMessagePanel('Now using Stellarium', 'green');
	}

	// Send socket
	socket.emit('setmode', {mode: mode});
});

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
			// Send to socket io
			console.log("Now sending coordinates: lat " + position.coords.latitude + ", lon " + position.coords.longitude);
			// User feedback
			spawnMessagePanel("Now sending coordinates: lat " + position.coords.latitude + ", lon " + position.coords.longitude, 'green');
			
			socket.emit('setlocation', {lat: position.coords.latitude, lon: position.coords.longitude})
		}, 
		function(err) {
			spawnMessagePanel('ERROR(' + err.code + '): ' + err.message, 'red');
			// User feedback
			spawnMessagePanel('Oeps, something went wrong. \n' + 'ERROR(' + err.code + '): ' + err.message);
			return 'ERROR(' + err.code + '): ' + err.message;
		}, 
			{
				enableHighAccuracy: true,
				timeout: 5000,
				maximumAge: 0
			}
		);
}

var colorArray = ['red', 'pink', 'purple', 'deep-purple', 'indigo', 'blue', 'light-blue', 'cyan', 'teal', 'green', 'light-green', 'lime', 'yellow', 'amber', 'orange', 'deep-orange', 'brown', 'grey', 'blue-grey', 'black', 'white'];
function spawnMessagePanel(message, color) {
	var $panel = $('.mesg-panel');
	var $text = $panel.find('.card-panel');
	$text.html(message);

	// Show spinner
	$text.html(message);

	// remove old colors
	for (var i = colorArray.length - 1; i >= 0; i--) {
		$text.removeClass(colorArray[i]);
	};
	
	$text.addClass(color);
	$panel.slideDown(500).delay(1000).slideUp(500);
}

function spawnDisconnectedMessage(message, color) {
	var $panel = $('.mesg-panel');
	var $text = $panel.find('.card-panel');
	$text.html(message);

	// Show spinner
	$text.html(
		message + 
		"\n" + 
		"<div class='progress'><div class='indeterminate'></div></div>"
  	);

	// remove old colors
	for (var i = colorArray.length - 1; i >= 0; i--) {
		$text.removeClass(colorArray[i]);
	};

	$text.addClass(color);
	$panel.slideDown(500);
}

socket.on('disconnect', function(err){
	$('.button-row').hide(0);
	spawnDisconnectedMessage('Server disconnected, trying to reconnect...', 'red');
});

socket.on('message', function(data) {
	console.log(data.text);
	spawnMessagePanel(data.text, 'blue');
});

socket.on('init', function(/* ?? */) {
	// Activate button row
	console.log("Socket connected.");
	spawnMessagePanel('Socket connected...', 'blue');
	$('.button-row').show(500);
});

socket.on('setmode', function() {
	// Mode set
	// 0 out
	// 1 track iss
	// 2 stellarium
	// get the mode that it would have been if error
});