var logLevels = require('veyron').logLevels;
var veyronConfig = {
  'logLevel': logLevels.INFO,
  'identityServer': 'http://localhost:5163/random/',
  'proxy': 'http://localhost:5165'
};

module.exports = veyronConfig;