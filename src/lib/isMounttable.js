var resolveRace = require('promises');

/**
 * isMounttable determines if a specific address refers to a
 * mounttable.
 * @param {object} client the veyron client to use.
 * @param {string} globResult result of glob to check.
 * @return {promise} promise to a boolean indicating if it is
 * a mounttable.
 */
 // TODO(bprosnitz) Remove dependency on _proxyConnection.
 // TODO(bprosnitz) Consider adding interface name to signature and using that.
module.exports  = function(client, globResult) {
  if (globResult.servers.length === 0) {
    // This is on the same mounttable as the globResult.
    return Promise.resolve(true);
  }

  var globbable = function(sig) {
    return sig['glob'] !== undefined && sig['glob'].inArgs.length === 1;
  };

  var pconn = client._proxyConnection;
  var promises = [];
  for (var i = 0; i < globResult.servers.length; i++) {
    var server = globResult.servers[i].server;
    promises.push(pconn.getServiceSignature(server).then(globbable));
  }

  return resolveRace(promises);
};