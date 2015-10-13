var Stellarium = require('node-telescope-server/servers/stellarium.js');
var Telescope = require('node-telescope-server/telescopes/dummy.js');

function initServer(params) {
  var server = new Stellarium(params);
  var laser = new Telescope(params);

  server.on('goto', function (position) {
    laser.goto(position);
  });

  laser.on('track', function (position) {
    server.track(position);
  });

  server.listen();

  return server;
}

initServer({
  port: 5001,
  debug: false,
  quiet: false,
  type: 'Stellarium',
  telescopeType: 'laz0r'
});
