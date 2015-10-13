var stellarium = require('node-telescope-server/servers/stellarium.js');
var telescope = require('node-telescope-server/telescopes/dummy.js');

exports.init = function(params) {
  var server = new stellarium(params);
  var laser = new telescope(params);

  server.on('goto', function (position) {
    laser.goto(position);
  });

  laser.on('track', function (position) {
    server.track(position);
  });

  server.listen();

  return server;
}