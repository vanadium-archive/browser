var veyron = require('veyron');
var mercury = require('mercury');
var LRU = require('lru-cache');
var namespaceUtil = veyron.namespaceUtil;
var veyronConfig = require('../../veyron-config');
var itemFactory = require('./item');
var freeze = require('../../lib/mercury/freeze');
var log = require('../../lib/log')('services:namespace:service');

module.exports = {
  getChildren: getChildren,
  getSignature: getSignature,
  glob: glob,
  makeRPC: makeRPC,
  util: namespaceUtil
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

/*
 * globCache holds (name + globQuery, result) cache entry for
 * GLOB_CACHE_MAX_SIZE items in an LRU cache
 */
var GLOB_CACHE_MAX_SIZE = 100;
var globCache = new LRU({
  max: GLOB_CACHE_MAX_SIZE
});
/*
 * Given a name and a glob query returns a promise of an observable array
 * of items as defined in @see item.js
 * As new items become available the observable array will change to reflect
 * the changes.
 * @param {string} name Object name to glob
 * @param {string} globQuery Glob query to run
 * @return {Promise.<mercury.array>} Promise of an observable array
 * of namespace items
 */
function glob(name, globQuery) {
  var cacheKey = namespaceUtil.join(name, globQuery);
  var cacheHit = globCache.get(cacheKey);
  if (cacheHit) {
    return Promise.resolve(cacheHit);
  }

  var runtime;
  var globItemsObservArr = mercury.array([]);
  var globItemsObservArrPromise =
  getRuntime().then(function getNamespace(rt) {
    runtime = rt;
    return runtime.newNamespace();
  }).then(function resolveName(namespace) {
    return namespace.resolveMaximally(name);
  }).then(function getGlobbableService(terminalNames) {
    // TODO(aghassemi): We should try all the names instead of the first.
    // Perhaps the library should allow me to pass a list of names.
    return runtime.bindTo(terminalNames[0]);
  }).then(function invokeGlob(globbableService) {
    // TODO(aghassemi) use watchGlob if available, otherwise fallback to glob
    return globbableService.glob(globQuery).stream;
  }).then(function updateResult(globStream) {
    globStream.on('data', function createNamespaceItem(result) {
      // Create an item as glob results come in and add the item to result
      getNamespaceItem(result.name, name, result.servers)
        .then(function(item) {
          globItemsObservArr.push(item);
        }).catch(function(err) {
          log.error('Failed to create item for "' + result.name + '"', err);
        });
    });

    globStream.on('error', function invalidateCacheAndLog(err) {
      globCache.del(cacheKey);
      // TODO(aghassemi) UI might want to know about this error so it can
      // tell the user things won't be updated automatically anymore and maybe
      // instruct them to reload.
      log.error('Glob stream error for', name, err);
    });

  }).then(function cacheAndReturnResult() {
    var immutableResult = freeze(globItemsObservArr);
    globCache.set(cacheKey, immutableResult);
    return immutableResult;
  }).catch( function invalidateCacheAndRethrow(err) {
    globCache.del(cacheKey);
    return Promise.reject(err);
  });

  // Return our Promise of observable array. It will get filled as data comes in
  return globItemsObservArrPromise;
}

/*
 * Given a name returns a promise of an observable array of immediate children
 * @param {string} name Object name to glob
 * @return {Promise.<mercury.array>} Promise of an observable array
 */
function getChildren(name) {
  name = name || '';
  return glob(name, '*');
}

/*
 * signatureCache holds (name, signature) cache entry for
 * SIGNATURECACHE_MAX_SIZE items in an LRU cache
 */
var SIGNATURE_CACHE_MAX_SIZE = 10000;
var signatureCache = new LRU({
  max: SIGNATURE_CACHE_MAX_SIZE
});
/*
 * Given a object name, returns a promise of the signature of methods available
 * on the object represented by that name.
 * @param {string} objectName Object name to get signature for
 * @return {object} signature for the object represented by the given name
 */
function getSignature(objectName) {
  var cacheHit = signatureCache.get(objectName);
  if (cacheHit) {
    return Promise.resolve(cacheHit);
  }
  return getRuntime().then(function bindToName(rt) {
    return rt.bindTo(objectName);
  }).then(function invokeSignatureMethod(service) {
    return service.signature();
  }).then(function cacheAndReturnSignature(sig) {
    signatureCache.set(objectName, sig);
    return sig;
  });
}

/*
 * Given a object name, returns whether the service referenced by the name
 * supports globbing.
 * @param {string} objectName Object name to check to see if globbale
 * @return {boolean} Whether the service is globbable
 */
function isGlobbable(objectName) {
  return getSignature(objectName).then(function(sig) {
    return sig['glob'] !== undefined;
  }).catch(function(e) {
    return false;
  });
}

/*
 * Make an RPC call on a service object.
 * name: string representing the name of the service
 * methodName: string for the service method name
 * args (optional): array of arguments for the service method
 */
function makeRPC(name, methodName, args) {
  return getRuntime().then(function bindToName(rt) {
    return rt.bindTo(name);
  }).then(function callMethod(service) {
    log.debug('Calling', methodName, 'on', name, 'with', args);
    return service[methodName].apply(null, args);
  }).then(function returnResult(result) {
    return result;
  });
}

/*
 * Creates an observable struct representing basic information about
 * an item in the namespace.
 * @param {string} name The full hierarchical object name of the item e.g.
 * "bar/baz/foo"
 * @param {string} mountedName The nonhierarchical name of the item used when it
 * was mounted to a mounttable. e.g. "Foo"
 * @param {Array<string>} List of server addresses this name points to, if any.
 * @return {merucry.struct}
 */
function getNamespaceItem(mountedName, parentName, servers) {
  var name = mountedName;
  if (parentName !== '') {
    name = namespaceUtil.join([parentName, name]);
  }

  // Find out if the object referenced by name is globbable and get
  // server related information about it.
  var isServer = servers.length > 0;
  return Promise.all([
    (!isServer ? Promise.resolve(true) : isGlobbable(name)),
    (isServer ? getServerInfo(name) : Promise.resolve(null))
  ]).then(function(results) {
    return itemFactory.createItem({
      objectName: name,
      mountedName: mountedName,
      isGlobbable: results[0],
      isServer: isServer,
      serverInfo: results[1]
    });
  });
}

/*
 * Creates an observable struct representing information about a server such as
 * type information, signature, etc...
 * @see item.js for details.
 * @param {string} objectName Object name to get serverInfo for.
 * @return {merucry.struct}
 */
function getServerInfo(objectName) {
  var signature;
  var isAccessible;
  return getSignature(objectName).then(function gotSignature(sig) {
    signature = sig;
    isAccessible = true;
    return getServerTypeInfo(sig);
  },function failedToGetSignature(err) {
    signature = {};
    //TODO(aghassemi): We should at least be able to tell if inaccessible
    //because not authorized vs other reasons.
    isAccessible = false;
    return createUnkownServiceTypeInfo();
  }).then(function(serverTypeInfo) {
    return itemFactory.createServerInfo({
      typeInfo: serverTypeInfo,
      signature: signature,
      isAccessible: isAccessible
    });
  });
}

/*
 * Creates an observable struct representing information about a server type.
 * For example if a server is known to be a mounttable or a store, the struct
 * would have information such as a key, human readable name and description for
 * the type of server.
 * @see item.js for details.
 * @param {string} objectName Object name to get serverTypeInfo for.
 * @return {merucry.struct}
 */
function getServerTypeInfo(signature) {
  // TODO(aghassemi) Ideally we want a .meta or maybe piggy backing on
  // .meta/stats to get information about a server. For now we just understand
  // mounttable and store. Everything else is unknown.
  var isMounttable = (signature &&
    signature['glob'] &&
    signature['mount'] &&
    signature['unmount']);

  if (isMounttable) {
    return itemFactory.createServerTypeInfo({
      key: 'veyron-mounttable',
      typeName: 'Mount Table',
      description: 'Mount table service allows registration ' +
        'and resolution of object names.',
      icon: 'social:circles-extended'
    });
  } else {
    return createUnkownServiceTypeInfo();
  }
}

function createUnkownServiceTypeInfo() {
  return itemFactory.createServerTypeInfo({
    key: 'veyron-unknown',
    typeName: 'Service',
    description: null,
    icon: 'cloud-queue'
  });
}