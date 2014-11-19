var veyron = require('veyron');
var mercury = require('mercury');
var LRU = require('lru-cache');
var jsonStableStringify = require('json-stable-stringify');
var namespaceUtil = veyron.namespaceUtil;
var veyronConfig = require('../../veyron-config');
var itemFactory = require('./item');
var freeze = require('../../lib/mercury/freeze');
var log = require('../../lib/log')('services:namespace:service');

module.exports = {
  getChildren: getChildren,
  getNamespaceItem: getNamespaceItem,
  getSignature: getSignature,
  hashSignature: hashSignature,
  makeRPC: makeRPC,
  search: search,
  util: namespaceUtil
};

/*
 * Lazy getter and initializer for Veyron runtime
 */
var _runtimePromiseInstance;

function getRuntime() {
  if (!_runtimePromiseInstance) {
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
 * @param {string} pattern Glob pattern
 * @return {Promise.<mercury.array>} Promise of an observable array
 * of namespace items
 */
function glob(pattern) {
  var cacheKey = 'glob|' + pattern;
  var cacheHit = globCache.get(cacheKey);
  if (cacheHit) {
    return Promise.resolve(cacheHit);
  }

  var globItemsObservArr = mercury.array([]);
  var globItemsObservArrPromise =
    getRuntime().then(function callGlobOnNamespace(rt) {
      // TODO(aghassemi) use watchGlob when available
      var namespace = rt.namespace();
      return namespace.glob(pattern).stream;
    }).then(function updateResult(globStream) {

      globStream.on('data', function createItem(result) {
        // Create an item as glob results come in and add the item to result
        createNamespaceItem(result.name, result.servers).then(function(item) {
          // TODO(aghassemi) namespace glob can return duplicate results, this
          // temporary fix keeps the one that's a server. Is this correct?
          // If a name can be more than one thing, UI needs change too.
          var existingItem = globItemsObservArr.filter(function(curItem) {
            return curItem().objectName === item().objectName;
          }).get(0);
          if (existingItem) {
            // override the old one if new item is a server
            if (item().isServer) {
              var index = globItemsObservArr.indexOf(existingItem);
              globItemsObservArr.put(index, item);
            }
          } else {
            globItemsObservArr.push(item);
          }
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
    }).catch(function invalidateCacheAndRethrow(err) {
      globCache.del(cacheKey);
      return Promise.reject(err);
    });

  // Return our Promise of observable array. It will get filled as data comes in
  return globItemsObservArrPromise;
}

/*
 * Time that if globbing for name does not return any results, we timeout.
 */
var MAX_GET_ITEM_TIMEOUT = 5000;
/*
 * Given a name, provide information about a the name as defined in @see item.js
 * @param {string} objectName Object name to get namespace item for.
 * @return {Promise.<mercury.value>} Promise of an observable value of an item
 * as defined in @see item.js
 */
function getNamespaceItem(objectName) {

  // Globbing the name itself would provide information about the name.
  return glob(objectName).then(function(resultsObs) {
    // wait until the glob has the one and only result before resolving
    return new Promise(function(resolve, reject) {
      var alreadyResolved = false;
      mercury.watch(resultsObs, function(results) {
        // wait until there is one item
        if (!alreadyResolved && results.length > 0) {
          var item = new mercury.value(results[0]);
          var immutableItem = freeze(item);
          alreadyResolved = true;
          resolve(immutableItem);
        }
      });

      setTimeout(function timer() {
        if (!alreadyResolved) {
          var err = new Error('Timeout: getNamespaceItem failed to get ' +
            'any results back in ' + MAX_GET_ITEM_TIMEOUT + 'ms');
          alreadyResolved = true;
          reject(err);
        }
      }, MAX_GET_ITEM_TIMEOUT);
    });
  });
}

/*
 * Given a name returns a promise of an observable array of immediate children
 * @param {string} parentName Object name to glob
 * @return {Promise.<mercury.array>} Promise of an observable array
 */
function getChildren(parentName) {
  parentName = parentName || '';
  var pattern = '*';
  if (parentName) {
    pattern = namespaceUtil.join(parentName, pattern);
  }
  return glob(pattern);
}

/*
 * Given a name and a glob search query returns a promise of an observable array
 * of items as defined in @see item.js
 * As new items become available the observable array will change to reflect
 * the changes.
 * @param {name} parentName Object name to search in.
 * @param {string} pattern Glob search pattern.
 * @return {Promise.<mercury.array>} Promise of an observable array
 * of namespace items
 */
function search(parentName, pattern) {
  parentName = parentName || '';
  if (parentName) {
    pattern = namespaceUtil.join(parentName, pattern);
  }
  return glob(pattern);
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
  var cacheKey = 'getSignature|' + objectName;
  var cacheHit = signatureCache.get(cacheKey);
  if (cacheHit) {
    return Promise.resolve(cacheHit);
  }
  return getRuntime().then(function bindToName(rt) {
    return rt.bindTo(objectName);
  }).then(function invokeSignatureMethod(service) {
    return service.signature();
  }).then(function cacheAndReturnSignature(sig) {
    signatureCache.set(cacheKey, sig);
    return sig;
  });
}

/*
 * Given a service signature, compute a reasonable hash that uniquely identifies
 * a service without containing unnecessary information.
 * TODO(alexfandrianto): This heuristic comes close, but it does not properly
 * distinguish services from each other.
 * Once available, add type info, streaming info, interface name, etc.
 */
function hashSignature(signature) {
  var cp = {};
  signature.forEach(function(method, methodName) {
    cp[methodName] = method.inArgs.length;
  });
  return jsonStableStringify(cp);
}

/*
 * Given a object name, returns whether the service referenced by the name
 * supports globbing.
 * @param {string} objectName Object name to check to see if globbale
 * @return {boolean} Whether the service is globbable
 */
function isGlobbable(objectName) {
  return getSignature(objectName).then(function(sig) {
    return sig.get('glob') !== undefined;
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
 * @param {string} name The object name
 * @param {Array<string>} List of server addresses this name points to, if any.
 * @return {merucry.struct}
 */
function createNamespaceItem(name, servers) {

  // mounted name relative to parent
  var mountedName = namespaceUtil.basename(name);

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
  }, function failedToGetSignature(err) {
    signature = new Map();
    //TODO(aghassemi): We should at least be able to tell if inaccessible
    //because not authorized vs other reasons.
    isAccessible = false;
    return createUnknownServiceTypeInfo();
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
    signature.get('glob') &&
    signature.get('mount') &&
    signature.get('unmount'));

  if (isMounttable) {
    return itemFactory.createServerTypeInfo({
      key: 'veyron-mounttable',
      typeName: 'Mount Table',
      description: 'Mount table service allows registration ' +
        'and resolution of object names.'
    });
  } else {
    return createUnknownServiceTypeInfo();
  }
}

function createUnknownServiceTypeInfo() {
  return itemFactory.createServerTypeInfo({
    key: 'veyron-unknown',
    typeName: 'Service',
    description: null
  });
}