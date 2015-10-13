var stellariumservermodule = require('node-telescope-server/servers/stellarium.js');

module.exports = function(params) {
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