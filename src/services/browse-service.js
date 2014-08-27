var veyron = require('veyron');
var namespaceUtil = veyron.namespaceUtil;
var veyronConfig = require('../veyron-config');
var MountPoint = require('../lib/mountpoint');
var debug = require('debug')('browse-service');

var runtimePromise = veyron.init(veyronConfig);

module.exports = {
  glob: glob,
  join: join,
  signature: signature,
  getTypeInfo : getTypeInfo,
  makeRPC: makeRPC,
  isRooted: isRooted,
  isGlobbable: isGlobbable,
  getSuffix: getSuffix,
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
 * Make an RPC call on a service object.
 * name: string representing the name of the service
 * methodName: string for the service method name
 * args (optional): array of arguments for the service method
 */
function makeRPC(name, methodName, args) {
  return runtimePromise.then(function(rt){
    return rt.bindTo(name).then(function(service) {
      debug('Calling', methodName, 'on', name, 'with', args);
      return service[methodName].apply(null, args).then(function(result) {
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
 * Given a name, determines if the given name was rooted
 */
function isRooted(name) {
  return namespaceUtil.isRooted(name);
}

/*
 * Given a name, determine its suffix.
 */
function getSuffix(name) {
  if (name === '' || name === '/') {
    return name;
  }
  var parts = name.split('/');
  var last = parts[parts.length - 1];
  if (last === '') {
    return parts[parts.length - 2];
  }
  return last;
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
