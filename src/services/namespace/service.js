// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vanadium = require('vanadium');
var mercury = require('mercury');
var LRU = require('lru-cache');
var EventEmitter = require('events').EventEmitter;
var vanadiumConfig = require('../../vanadium-config');
var itemFactory = require('./item');
var freeze = require('../../lib/mercury/freeze');
var sortedPush = require('../../lib/mercury/sorted-push-array');
var log = require('../../lib/log')('services:namespace:service');
var naming = vanadium.naming;
naming.parseName = parseName;

module.exports = {
  getChildren: getChildren,
  getNamespaceItem: getNamespaceItem,
  getRemoteBlessings: getRemoteBlessings,
  getSignature: getSignature,
  getAccountName: getAccountName,
  getObjectAddresses: getObjectAddresses,
  getPermissions: getPermissions,
  resolveToMounttable: resolveToMounttable,
  makeRPC: makeRPC,
  search: search,
  util: naming,
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
 * Returns the accountName for the currently logged in user
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
      globStream.on('data', function createItem(globResult) {
        // Create an item as glob results come in and add the item to result
        var item = createNamespaceItem(globResult);

        var existingItem = globItemsObservArr.filter(function(curItem) {
          return curItem().objectName === item().objectName;
        }).get(0);
        if (existingItem) {
          // override the old one if new item has server
          if (item().hasServer) {
            var index = globItemsObservArr.indexOf(existingItem);
            globItemsObservArr.put(index, item);
          }
        } else {
          var sorter = 'mountedName';
          sortedPush(globItemsObservArr, item, sorter);
        }
      });

      globStream.on('end', function() {
        immutableResult.events.emit('end');
        immutableResult._hasEnded = true;
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
          resolve(resultsObs.get(0));
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
    pattern = naming.join(parentName, pattern);
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
    pattern = naming.join(parentName, pattern);
  }
  return glob(pattern);
}

/*
 * Given a name, provide information about its mount point permissions.
 * @param {string} objectName Object name to get permissions for.
 * @return {Promise.<mercury.value<vanadium.security.Permissions>>} Promise of a
 * vanadium.security.Permissions object.
 */
function getPermissions(name) {
  return getRuntime().then(function(rt) {
    var ctx = rt.getContext().withTimeout(RPC_TIMEOUT);
    var ns = rt.namespace();
    return ns.getPermissions(ctx, name);
  }).then(function(results) {
    // getPermissions return multiple results, permissions is at
    // outArg position 0
    return mercury.value(results[0]);
  });
}

/*
 * Given a name, provide information about its mounttable objectAddress.
 * @param {string} objectName Object name to get mounttable objectAddress for.
 * @return {Promise.<mercury.array<string>>} Promise of an array of
 * objectAddress strings.
 */
function resolveToMounttable(name) {
  return getRuntime().then(function(rt) {
    var ctx = rt.getContext().withTimeout(RPC_TIMEOUT);
    var ns = rt.namespace();
    return ns.resolveToMounttable(ctx, name);
  }).then(function(objectAddresses) {
    return mercury.array(objectAddresses);
  });
}

/*
 * Given a name, provide information about its objectAddresses.
 * @param {string} objectName Object name to get objectAddresses for.
 * @return {Promise.<mercury.array<string>>} Promise of an observable value an
 * array of string objectAddresses
 */
function getObjectAddresses(name) {
  return getRuntime().then(function resolve(rt) {
    var resolveCtx = rt.getContext().withTimeout(RPC_TIMEOUT);
    var ns = rt.namespace();
    return ns.resolve(resolveCtx, name);
  }).then(function(objectAddresses) {
    return mercury.array(objectAddresses);
  });
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
 * @see item.js
 * @param {MountEntry} mountEntry The mount entry from glob results.
 * @return {Mercury.struct} observable struct representing basic information
 * about an item.
 */
function createNamespaceItem(mountEntry) {

  var name = mountEntry.name;

  // mounted name relative to parent
  var mountedName = naming.basename(name);
  var isLeaf = mountEntry.isLeaf;
  var hasServer = mountEntry.servers.length > 0 ||
    !mountEntry.servesMountTable;
  var hasMountPoint = mountEntry.servers.length > 0 ||
    mountEntry.servesMountTable;
  var isMounttable = mountEntry.servers.length > 0 &&
    mountEntry.servesMountTable;

  var item = itemFactory.createItem({
    objectName: name,
    mountedName: mountedName,
    isLeaf: isLeaf,
    hasServer: hasServer,
    hasMountPoint: hasMountPoint,
    isMounttable: isMounttable
  });

  return item;
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
  var splitName = naming.splitAddressName(name);
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