var logLevels = require('veyron').logLevels;
var veyronConfig = {
  'logLevel': logLevels.INFO,
  'wspr': 'http://localhost:8124',
  'authenticate': true
};

module.exports = veyronConfig;
