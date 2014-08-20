var browseService = require('../../../services/browse-service');
var debug = require('debug')('make-rpc');

module.exports = makeRPC;

function makeRPC(state, data) {
  if (data.hasParams) {
    return;
  }

  browseService.makeRPC(data.name, data.methodName).then(function(result) {
    console.log('Received: ', result);
  }, function(err) {
    console.error('Failed: ', err);
    debug('Error during RPC',
      data.name,
      data.methodName,
      err, (err && err.stack) ? err.stack : undefined
    );
  });
}