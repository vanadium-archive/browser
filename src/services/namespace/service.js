var vanadium = require('vanadium');
var mercury = require('mercury');
var bluebirdPromise = require('bluebird');
var LRU = require('lru-cache');
var EventEmitter = require('events').EventEmitter;
var vanadiumConfig = require('../../vanadium-config');
var itemFactory = require('./item');
var freeze = require('../../lib/mercury/freeze');
var sortedPush = require('../../lib/mercury/sorted-push-array');
var log = require('../../lib/log')('services:namespace:service');
var ItemTypes = require('./item-types');
var namespaceUtil = vanadium.naming.util;
namespaceUtil.parseName = parseName;

module.exports = {
  getChildren: getChildren,
  getNamespaceItem: getNamespaceItem,
  getRemoteBlessings: getRemoteBlessings,
  getSignature: getSignature,
  getAccountName: getAccountName,
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
 * Lazy getter and initializer for Vanadium runtime
 */
var _runtimePromiseInstance;

function getRuntime() {
  if (!_runtimePromiseInstance) {
    _runtimePromiseInstance = vanadium.init(vanadiumConfig);
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
var GLOB_CACHE_MAX_SIZE = 10000;
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
 * and emits 'end' and 'globError' events.
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

  var globItemsObservArr = mercury.array([]);
  var immutableResult = freeze(globItemsObservArr);
  immutableResult.events = new EventEmitter();
  var ctx;
  var globItemsObservArrPromise =
    getRuntime().then(function callGlobOnNamespace(rt) {
      ctx = rt.getContext().withTimeout(RPC_TIMEOUT);
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
          if (item().itemType === ItemTypes.server) {
            var index = globItemsObservArr.indexOf(existingItem);
            globItemsObservArr.put(index, item);
          }
        } else {
          var sorter = 'mountedName';
          sortedPush(globItemsObservArr, item, sorter);
        }

        itemPromises.push(onFinishPromise);
      });

      globStream.on('end', function() {
        var triggerEnd = function() {
          immutableResult.events.emit('end');
          immutableResult._hasEnded = true;
        };

        // Wait until all createItem promises return before triggering has ended
        // We are using Bluebird's settle() since Promise.all won't work as
        // it will get rejected as soon as one is rejected but we want to know
        // when all have resolved/rejected which is what settle() does.
        bluebirdPromise.settle(itemPromises).then(triggerEnd).catch(triggerEnd);
      });

      globStream.on('error', function emitGlobErrorAndLog(err) {
        immutableResult.events.emit('globError', err);
        log.warn('Glob stream error for', name, err);
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
 * remoteBlessingsCache holds (name, []string) cache entry for
 * REMOTE_BLESSINGS_CACHE_MAX_SIZE items in an LRU cache
 */
var REMOTE_BLESSINGS_CACHE_MAX_SIZE = 10000;
var remoteBlessingsCache = new LRU({
  max: REMOTE_BLESSINGS_CACHE_MAX_SIZE
});
/*
 * Given an object name, returns a promise of the service's remote blessings.
 * @param {string} objectName Object name to get remote blessings for
 * @return {[]string} remoteBlessings The service's remote blessings.
 */
function getRemoteBlessings(objectName) {
  var cacheKey = 'getRemoteBlessings|' + objectName;
  var cacheHit = remoteBlessingsCache.get(cacheKey);
  if (cacheHit) {
    return Promise.resolve(cacheHit);
  }
  return getRuntime().then(function invokeRemoteBlessingsMethod(rt) {
    var ctx = rt.getContext().withTimeout(RPC_TIMEOUT);
    var client = rt.newClient();
    return client.remoteBlessings(ctx, objectName);
  }).then(function cacheAndReturnRemoteBlessings(remoteBlessings) {
    // Remote Blessings is []string representing the principals of the service.
    remoteBlessingsCache.set(cacheKey, remoteBlessings);
    return remoteBlessings;
  });
}

/*
 * signatureCache holds (name, signature) cache entry for
 * SIGNATURE_CACHE_MAX_SIZE items in an LRU cache
 */
var SIGNATURE_CACHE_MAX_SIZE = 10000;
var signatureCache = new LRU({
  max: SIGNATURE_CACHE_MAX_SIZE
});
/*
 * Given a object name, returns a promise of the signature of methods available
 * on the object represented by that name.
 * @param {string} objectName Object name to get signature for
 * @return {signature} signature for the object represented by the given name
 */
function getSignature(objectName) {
  var cacheKey = 'getSignature|' + objectName;
  var cacheHit = signatureCache.get(cacheKey);
  if (cacheHit) {
    return Promise.resolve(cacheHit);
  }
  return getRuntime().then(function invokeSignatureMethod(rt) {
    var ctx = rt.getContext().withTimeout(RPC_TIMEOUT);
    var client = rt.newClient();
    return client.signature(ctx, objectName);
  }).then(function cacheAndReturnSignature(signature) {
    // Signature is []interface; each interface contains method data.
    signatureCache.set(cacheKey, signature);
    return signature;
  });
}

/*
 * Make an RPC call on a service object.
 * name: string representing the name of the service
 * methodName: string for the service method name
 * args (optional): array of arguments for the service method
 */
function makeRPC(name, methodName, args) {
  // Adapt the method name to be lowercase again.
  methodName = methodName[0].toLowerCase() + methodName.substr(1);

  var ctx;
  return getRuntime().then(function bindToName(rt) {
    ctx = rt.getContext();
    var client = rt.newClient();
    return client.bindTo(ctx, name);
  }).then(function callMethod(service) {
    log.debug('Calling', methodName, 'on', name, 'with', args);
    args.unshift(ctx.withTimeout(RPC_TIMEOUT));
    return service[methodName].apply(null, args);
  }).then(function returnResult(result) {
    // If the result was for 0 outArg, then this returns undefined.
    // If the result was for 1 outArg, then it gets a single output.
    // If the result was for >1 outArgs, then we return []output.
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

  var itemType = ItemTypes.unknown;

  // get server related information.
  if (servers.length > 0) {
    // NOTE: servers.length > 0 is not enough
    // to know if something is a server or not we also have to call resolve()
    // later to determine the itemType better as it could be that
    // servers.length === 0 and yet the name is a server
    itemType = ItemTypes.server;
  }

  // Also endpoints need to come from resolve() call and not servers[].
  // See following bug report for details:
  // https://github.com/veyron/release-issues/issues/1072 to track a proper fix
  // TODO(aghassemi) make itemType and endpoints synchronous again if/when the
  // issue above is fixed.
  var serverInfo = getServerInfo(name, mountEntry);

  var item = itemFactory.createItem({
    objectName: name,
    mountedName: mountedName,
    isGlobbable: false,
    itemType: itemType,
    serverInfo: serverInfo
  });

  // find out if the object referenced by name is globbable and accessible
  // asynchronously and update the state when it comes back
  var hasChildrenPromise = new Promise(function(resolve, reject) {
    // glob for 'object/name/*', this will tell is if the name has any children
    // also the errors can be used to detect if name is accessible or not.
    //TODO(aghassemi) we no longer need to do this since glob tells us
    //if something is globbable or not in the GlobError, switch to that
    //See https://github.com/veyron/release-issues/issues/1307
    getRuntime().then(function hasChildren(rt) {
      var ctx = rt.getContext().withTimeout(RPC_TIMEOUT).withCancel();
      var ns = rt.namespace();
      var globStream = ns.glob(ctx, namespaceUtil.join(name, '*')).stream;
      globStream.once('data', function createItem() {
        // we have at least one child
        item.isGlobbable.set(true);
        ctx.cancel();
        resolve();
      });
      globStream.once('error', function createItem(globResult) {

        if (globResult.name === name &&
          globResult.error instanceof vanadium.errors.NoServersError) {

          item.itemType.set(ItemTypes.inaccessible);
          item.itemError.set(globResult.toString());
          ctx.cancel();
          resolve();
        }
      });
      globStream.once('end', function() {
        resolve();
      });
    });
  });

  //TODO(aghassemi) current workaround for knowing if a name is a subtable
  //service or not. See https://github.com/veyron/release-issues/issues/1072
  var resolveNamePromise = getRuntime().then(function hasChildren(rt) {
    var resolveCtx = rt.getContext().withTimeout(RPC_TIMEOUT);
    var ns = rt.namespace();
    return ns.resolve(resolveCtx, name).then(function(endpoints) {
      // it resolved to an endpoint, type is a server
      item.itemType.set(ItemTypes.server);
      endpoints.forEach(function(ep) {
        serverInfo.endpoints.push(ep);
      });
    }, function(err) {
      if (err.id === 'v.io/v23/naming.nameDoesntExist') {
        // we got nameDoesntExist error, it must be an subtable node.
        item.itemType.set(ItemTypes.subtable);
      } else {
        // TODO(aghassemi) Glob probably should not return items if their parent
        // is inaccessible. https://github.com/veyron/release-issues/issues/1161
        // For now we inspect the error as a work-around.
        item.itemType.set(ItemTypes.inaccessible);
        item.itemError.set(err.toString());
      }
    });
  });

  // We are using .settle instead of .all because we don't want to resolve the
  // onFinishPromise if one is rejected early.
  var onFinishPromise = bluebirdPromise.settle(
    [hasChildrenPromise, resolveNamePromise]
  ).then(function(results) {
    if (results[0].isRejected()) {
      log.error('hasChildrenPromise failed in createNamespaceItem for ' +
        name, results[0].reason());
    }
    if (results[1].isRejected()) {
      log.error('resolveNamePromise failed in createNamespaceItem for ' +
        name, results[1].reason());
    }
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
  var serverInfo = itemFactory.createServerInfo({
    typeInfo: typeInfo,
    endpoints: mercury.array([])
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

  var isMounttable = mountEntry.servesMountTable;
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

/*
 * Given an arbitrary Vanadium name, parses it into an array
 * of strings.
 * For example, if name is "/ns.dev.v.io:8101/global/rps"
 * returns ["ns.dev.v.io:8101", "global", "rps"]
 * Can use namespaceService.util.isRooted to see if the name
 * is rooted (begins with a slash).
 * Note that the address part can contain slashes.
 */
function parseName(name) {
  var splitName = namespaceUtil.splitAddressName(name);
  var namespaceParts = [];
  if (splitName.address) {
    namespaceParts.push(splitName.address);
  }
  if (splitName.suffix) {
    var suffixParts = splitName.suffix.split('/');
    namespaceParts = namespaceParts.concat(suffixParts);
  }
  return namespaceParts;
}
