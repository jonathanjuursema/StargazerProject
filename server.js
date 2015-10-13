/* Loading required dependencies. */
var express = require('express');
var webserver = express();

/* Loading local modules. */
var stellariumserver = require('./stellariumserver.js')

/* Starting Stellarium server. */
stellariumserver.init({
  port: 5050,
  debug: false,
  quiet: false,
  type: 'Stellarium',
  telescopeType: 'laz0r'
});

/* Starting webserver */
webserver.use(express.static('htdocs'));
webserver.listen(process.env.PORT || 5000);
