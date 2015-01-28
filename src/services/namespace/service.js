var veyron = require('veyron');
var mercury = require('mercury');
var LRU = require('lru-cache');
var EventEmitter = require('events').EventEmitter;
var jsonStableStringify = require('json-stable-stringify');
var namespaceUtil = veyron.namespaceUtil;
var veyronConfig = require('../../veyron-config');
var itemFactory = require('./item');
var freeze = require('../../lib/mercury/freeze');
var adaptSignature = require('./signature-adapter');
var log = require('../../lib/log')('services:namespace:service');

module.exports = {
  getChildren: getChildren,
  getNamespaceItem: getNamespaceItem,
  getSignature: getSignature,
  getAccountName: getAccountName,
  hashSignature: hashSignature,
  makeRPC: makeRPC,
  search: search,
  util: namespaceUtil,
  initVanadium: getRuntime
};

//TODO(aghassemi) What's a good timeout? It should be shorter than this.
//Can we use ML to dynamically change the timeout?
//Should this be a user settings?
var RPC_TIMEOUT = 15 * 1000;

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
 * Returns the accountName for the currently logged in user of Viz
 * @return {Promise.<string>}
 */
function getAccountName() {
  return getRuntime().then(function(rt) {
    return rt.accountName;
  });
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
 *
 * The observable result has an events property which is an EventEmitter
 * and emits 'end' and 'streamError' events.
 *
 * @param {string} pattern Glob pattern
 * @return {Promise.<mercury.array>} Promise of an observable array
 * of namespace items
 */
function glob(pattern) {
  var cacheKey = 'glob|' + pattern;
  var cacheHit = globCache.get(cacheKey);
  if (cacheHit) {
    // The addition of the end event to mark the end of a glob requires that
    // our cache also causes the same event to be emitted.
    if (cacheHit._hasEnded) {
      // Remove old listeners to avoid memory leak but now we need to set
      // _hasEnded to false until we trigger again otherwise a new request
      // could wipe out an outstanding listener.
      cacheHit._hasEnded = false;
      cacheHit.events.removeAllListeners();
      process.nextTick(function() {
        cacheHit.events.emit('end');
        cacheHit._hasEnded = true;
      });
    }
    return Promise.resolve(cacheHit);
  }

  var ctx = veyron.context.Context().withTimeout(RPC_TIMEOUT);
  var globItemsObservArr = mercury.array([]);
  var immutableResult = freeze(globItemsObservArr);
  immutableResult.events = new EventEmitter();
  var globItemsObservArrPromise =
    getRuntime().then(function callGlobOnNamespace(rt) {
      // TODO(aghassemi) use watchGlob when available
      var namespace = rt.namespace();
      return namespace.glob(ctx, pattern).stream;
    }).then(function updateResult(globStream) {
      var itemPromises = [];

      globStream.on('data', function createItem(globResult) {
        // Create an item as glob results come in and add the item to result
        var result = createNamespaceItem(globResult);
        var item = result.item;
        var onFinishPromise = result.onFinish;

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

        itemPromises.push(onFinishPromise);
      });

      globStream.on('end', function() {
        var triggerEnd = function() {
          immutableResult.events.emit('end');
          immutableResult._hasEnded = true;
        };

        // Wait until all createItem promises return before triggering has ended
        Promise.all(itemPromises).then(triggerEnd).catch(triggerEnd);
      });

      globStream.on('error', function invalidateCacheAndLog(err) {
        globCache.del(cacheKey);
        immutableResult.events.emit('streamError', err);
        log.error('Glob stream error for', name, err);
      });

    }).then(function cacheAndReturnResult() {
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
 * Given a name, provide information about a the name as defined in @see item.js
 * @param {string} objectName Object name to get namespace item for.
 * @return {Promise.<mercury.value>} Promise of an observable value of an item
 * as defined in @see item.js
 */
function getNamespaceItem(objectName) {

  // Globbing the name itself would provide information about the name.
  return glob(objectName).then(function(resultsObs) {
    // Wait until the glob finishes before returning the item
    return new Promise(function(resolve, reject) {
      resultsObs.events.on('streamError', function(err) {
        reject(err);
      });
      resultsObs.events.on('end', function() {
        var results = resultsObs();
        if (results.length === 0) {
          reject(new Error(objectName + ' Not Found'));
        } else {
          var item = new mercury.value(results[0]);
          var immutableItem = freeze(item);
          resolve(immutableItem);
        }
      });
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
  return getRuntime().then(function invokeSignatureMethod(rt) {
    var ctx = veyron.context.Context().withTimeout(RPC_TIMEOUT);
    var client = rt.newClient();
    return client.signature(ctx, objectName);
  }).then(function cacheAndReturnSignature(signatures) {
    var adaptedSignature = adaptSignature(signatures);
    signatureCache.set(cacheKey, adaptedSignature);
    return adaptedSignature;
  });
}

/*
 * Given a service signature, compute a reasonable hash that uniquely identifies
 * a service without containing unnecessary information.
 * TODO(alexfandrianto): This heuristic comes close, but it does not properly
 * distinguish services from each other.
 * The adapted signature now has type info, streaming info, interface name, etc.
 */
function hashSignature(adaptedSignature) {
  var cp = [];
  adaptedSignature.forEach(function(method, methodName) {
    cp[methodName] = method.inArgs.length;
  });
  return jsonStableStringify(cp);
}

/*
 * TODO(aghassemi) Technically right now every server is globbable
 * so our definition of globbable is whether the server in question
 * has any children.
 * We may want to consider exposing some metadata about a service on
 * whether that service actually implements Glob or GetChildren
 * interfaces in a custom way or not.
 *
 * Given a object name, returns whether the service referenced by the name
 * supports globbing.
 * @param {string} objectName Object name to check to see if globbale
 * @return {boolean} Whether the service is globbable
 */
function isGlobbable(objectName) {
  return getChildren(objectName).then(function(obs) {
    return new Promise(function(resolve, reject) {
      var onEndListener = function() {
        // no children
        resolve(false);
        removeWatch();
      };
      // resolve as soon as we find one child
      var removeWatch = mercury.watch(obs, function(children) {
        if (children.length > 0) {
          resolve(true);
        }
      });
      obs.events.once('end', onEndListener);
    });
  }).catch(function() {
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
    var ctx = veyron.context.Context().withTimeout(RPC_TIMEOUT);
    var client = rt.newClient();
    return client.bindTo(ctx, name);
  }).then(function callMethod(service) {
    log.debug('Calling', methodName, 'on', name, 'with', args);
    var ctx = veyron.context.Context().withTimeout(RPC_TIMEOUT);
    args.unshift(ctx);
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
 * @param {MountEntry} mountEntry The mount entry from glob results.
 * @param {Array<string>} List of server addresses this name points to, if any.
 * @return item: {mercury.struct} onFinish: {Promise<bool>} Promise indicating
 * we have loaded all the information including the async ones for the item.
 */
function createNamespaceItem(mountEntry) {

  var name = mountEntry.name;

  // mounted name relative to parent
  var mountedName = namespaceUtil.basename(name);
  var servers = mountEntry.servers;

  // get server related information.
  var isServer = servers.length > 0;
  var serverInfo = null;
  if (isServer) {
    serverInfo = getServerInfo(name, mountEntry);
  }

  var item = itemFactory.createItem({
    objectName: name,
    mountedName: mountedName,
    isGlobbable: false,
    isServer: isServer,
    serverInfo: serverInfo
  });

  // find out if the object referenced by name is globbable asynchronously and
  // update the state when it comes back
  var onFinishPromise = isGlobbable(name).then(function(isGlobbable) {
    item.isGlobbable.set(isGlobbable);
    return true;
  }).catch(function() {
    return true;
  });

  return {
    item: item,
    onFinish: onFinishPromise
  };
}

/*
 * Creates an observable struct representing information about a server such as
 * type information
 * @see item.js for details.
 * @param {string} objectName Object name to get serverInfo for.
 * @param {MountEntry} mountEntry mount entry to item to get serverInfo for.
 * @return {mercury.struct}
 */
function getServerInfo(objectName, mountEntry) {
  var typeInfo = getServerTypeInfo(mountEntry);
  var endpoints = getEndpoints(mountEntry);
  var serverInfo = itemFactory.createServerInfo({
    typeInfo: typeInfo,
    endpoints: endpoints
  });

  return serverInfo;
}

/*
 * Creates an observable struct representing information about a server type.
 * For example if a server is known to be a mounttable or a store, the struct
 * would have information such as a key, human readable name and description for
 * the type of server.
 * @see item.js for details.
 * @param {MountEntry} mountEntry mount entry to get serverTypeInfo for.
 * @return {mercury.struct}
 */
function getServerTypeInfo(mountEntry) {
  // Currently we only support detecting mounttables which is
  // based on a "MT" flag that comes from the Glob API. Mounttables are special
  // in a sense that we fundamentally "know" they are a mounttable.
  // Later when we extend the support for other services, we need to do
  // either duck typing and have a special __meta route that provides metadata
  // information about a service.

  var isMounttable = mountEntry.mT;
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

/**
 * Creates an observable array with the endpoints of the mountEntry.
 * @param {MountEntry} mountEntry mount entry with server endpoints.
 * @return {mercury.array} Mercury array containing the endpoints.
 */
function getEndpoints(mountEntry) {
  // Convert the endpoints into a mercury list.
  return mercury.array(
    mountEntry.servers.map(function(endpoint) {
      return mercury.value(endpoint.server);
    })
  );
}

function createUnknownServiceTypeInfo() {
  return itemFactory.createServerTypeInfo({
    key: 'veyron-unknown',
    typeName: 'Service',
    description: null
  });
}
