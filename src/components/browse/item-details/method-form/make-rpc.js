var browseService = require('../../../../services/browse-service');
var debug = require('debug')(
  'components:browse:item-details:method-form:make-rpc'
);

module.exports = makeRPC;

/*
 * Use the browseService to perform an RPC request, resolving with the result
 * or rejecting with the error.
 * data needs to have name, methodName, and args.
 */
function makeRPC(data) {
  // TODO(alexfandrianto): Once JS signatures have type information and/or VOM
  // gets better, we can be smarter about this.
  // Parse if possible. Otherwise, a string (or invalid JSON) will be used.
  // Solves a problem where booleans did not seem to be parsed properly.
  var args = data.args.map(function(arg) {
    try {
      return JSON.parse(arg);
    } catch(e) {
      return arg;
    }
  });

  return browseService.makeRPC(data.name, data.methodName, args).catch(
    function(err) {
      debug('Error during RPC',
        data.name,
        data.methodName,
        err, (err && err.stack) ? err.stack : undefined
      );
      return Promise.reject(err);
    }
  );
}