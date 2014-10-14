var veyron = require('veyron');
var veyronConfig = require('../veyron-config');

module.exports = {
  getTypeInfo : getTypeInfo,
  isGlobbable: isGlobbable
};

/*
 * Lazy getter and initializer for Veyron runtime
 */
var _runtimePromiseInstance;
function getRuntime() {
  if(!_runtimePromiseInstance) {
    _runtimePromiseInstance = veyron.init(veyronConfig);
  }
  return _runtimePromiseInstance;
}


// TODO(aghassemi): how to invalidate? An explicit refresh button?
var sigcache = {};
/*
 * Given a name, returns a promise of the signature of methods available on the
 * object represented by that name.
 */
function signature(name) {
  if( sigcache[name] ) {
    return Promise.resolve(sigcache[name]);
  }
  return getRuntime().then(function(rt){
    return rt.bindTo(name).then(function(service) {
      return service.signature().then(function(sig) {
        sigcache[name] = sig;
        return sig;
      });
    });
  });
}

/*
 * Given signature of an item returns type information
 * TODO(aghassemi) We need actual type information in signature, this code makes
 * highly speculative assumptions.
 */
function getTypeInfo(signature) {

  var typeName = 'Unknown';
  var typeDescription = 'Type of item is now known.';

  if (!signature) {
    typeName = 'Intermediary Name';
    typeDescription = 'Intermediary node in the namespace';
  } else if (isMounttable(signature)) {
    typeName = 'Mounttable';
    typeDescription = 'Item resolves to a Mounttable server';
  } else {
    typeName = 'Server';
    typeDescription = 'Item resolves to a regular server.';
  }

  return {
    name: typeName,
    description: typeDescription
  };
}

/*
 * Given signature of an item returns whether it is a mounttable service or not
 * TODO(aghassemi) We need actual type information in signature, this code makes
 * highly speculative assumptions.
 */
function isMounttable(signature) {
  return (signature &&
    signature['glob'] &&
    signature['mount'] &&
    signature['unmount']);
}

function isGlobbable(name) {
  return signature(name).then( function(sig) {
    return sig['glob'] !== undefined;
  }).catch( function(e) {
    // TODO(aghassemi) This is very wrong, not having a signature does not mean
    // globbable will do for prototype.
    // TODO(alexfandrianto): Agrees that this is very wrong. Passing an invalid
    // name can lead to a true isGlobbable result.
    if(e && e.message && e.message.indexOf('Name doesn\'t exist') > -1) {
      return true;
    }
    return false;
  });
}
