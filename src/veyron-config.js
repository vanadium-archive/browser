var logLevels = require('veyron').logLevels;
var veyronConfig = {
  'logLevel': logLevels.INFO,
  'wspr': 'http://localhost:8124',
  // TODO(alexfandrianto): Set this back to true ASAP.
  'authenticate': false
};

module.exports = veyronConfig;
