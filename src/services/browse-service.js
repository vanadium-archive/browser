var veyron = require('veyron');
var namespaceUtil = veyron.namespaceUtil;

var veyronConfig = require('../veyron-config');
var MountPoint = require('../lib/mountpoint');

var runtimePromise = veyron.init(veyronConfig);

module.exports = {
  glob: glob,
  join: join,
  signature: signature,
  getTypeInfo : getTypeInfo,
  isRooted: isRooted,
  isGlobbable: isGlobbable,
  makeRPC: makeRPC,
};

/*
 * Cache of Name to MountPoint objects
 */
var mpcache = {
  _cacheMap: {},
  get: function(name) {
    return runtimePromise.then(function(rt) {
      return rt.newNamespace().then(function(ns) {
        // TODO(aghassemi) why is namespace a promise?!
        if (!mpcache._cacheMap[name]) {
          mpcache._cacheMap[name] = new MountPoint(rt, ns, name);
        }
        return mpcache._cacheMap[name];
      });
    });
  }
};

// TODO(aghassemi) how to invalidate?
var globcache = {};
/*
 * Given a name and a glob query, returns promise of items that match the query
 * Each item is of the form:
 * {
 *    mountedName: 'CornerThermostat' //The  mount name of the item
 *    name: 'JohnHouse/LivingRoom/CornerThermostat' //Full name of the item
 * }
 */
function glob(name, globQuery) {
  if(globcache[name] && globcache[name][globQuery]) {
    return Promise.resolve(globcache[name][globQuery]);
  }

  return mpcache.get(name).then(function glob(mountPoint) {
    if( mountPoint['glob'] !== undefined) {
      return mountPoint.glob(globQuery);
    } else {
      var err = new Error('Object does not support glob operation');
      return Promise.reject(err);
    }

  }).then(function createItems(globResults) {
    if( globcache[name] === undefined) {
      globcache[name] = {};
    }
    var result = globResults.map(function(result) {
      var itemName = result.name;
      if (name !== '') {
        itemName = namespaceUtil.join([name, itemName]);
      }
      return {
        mountedName: result.name,
        name: itemName
      };
    });

    result.sort(function(a,b) {
      return a.mountedName.localeCompare(b.mountedName);
    });

    globcache[name][globQuery] = result;
    return result;
  });
}

// TODO(aghassemi) how to invalidate?
var sigcache = {};
/*
 * Given a name, returns a promise of the signature of methods available on the
 * object represented by that name.
 */
function signature(name) {
  if( sigcache[name] ) {
    return Promise.resolve(sigcache[name]);
  }
  return runtimePromise.then(function(rt){
    return rt.bindTo(name).then(function(service) {
      return service.signature().then(function(sig) {
        sigcache[name] = sig;
        return sig;
      });
    });
  });
}

/*
 * Given a name and a methodName with no parameters, make an RPC call for that
 * method on the object represented by that name.
 */
function makeRPC(name, methodName) {
  return runtimePromise.then(function(rt){
    return rt.bindTo(name).then(function(service) {
      console.log('Calling ', methodName, ' on ', name);
      return service[methodName]().then(function(result) {
        return result;
      });
    });
  });
}

/*
 * Given a name and a suffix, it joins them to create a single name
 */
function join(nameParts) {
  return namespaceUtil.join(nameParts);
}

/*
 * Given a name and a suffix, it joins them to create a single name
 */
function isRooted(name) {
  return namespaceUtil.isRooted(name);
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
    // globbable will do for prototype
    if(e && e.message && e.message.indexOf('Name doesn\'t exist') > -1) {
      return true;
    }
    return false;
  });
}
