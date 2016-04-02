// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var LRU = require('lru-cache');
var EventEmitter = require('events').EventEmitter;
var itemFactory = require('./item');
var freeze = require('../../lib/mercury/freeze');
var sortedPush = require('../../lib/mercury/sorted-push-array');
var log = require('../../lib/log')('services:namespace:service');
var naming = require('./naming-util.js');
naming.parseName = parseName;

module.exports = {
  getChildren: getChildren,
  getNamespaceItem: getNamespaceItem,
  getRemoteBlessings: getRemoteBlessings,
  getSignature: getSignature,
  getAccountName: getAccountName,
  getEmailAddress: getEmailAddress,
  getObjectAddresses: getObjectAddresses,
  getPermissions: getPermissions,
  resolveToMounttable: resolveToMounttable,
  makeRPC: makeRPC,
  search: search,
  util: naming,
  clearCache: clearCache,
  deleteMountPoint: deleteMountPoint,
  prefixes: prefixes
};


/*
 * Returns an EventSource object connected to the local network.
 * Only certain types of requests are allowed.
 *
 * accountName: <no parameters>  => { accountName: <string>, err: <err> }
 * glob: string pattern  => a stream of responses
 *   { globRes: <glob res>, globErr: <glob err>, globEnd: <bool>, err: <err> }
 * permissions: string name =>  { permissions: <permissions>, err: <err> }
 * deleteMountPoint: string name => { err: <err string> }
 * resolveToMounttable: string name => { addresses: []<string>, err: <err> }
 * objectAddresses: string name => { addresses: []<string>, err: <err> }
 * remoteBlessings: string name => { blessings: []<string>, err: <err> }
 * signature: string name => { signature: <signature>, err: <err> }
 * makeRPC: { name: <string>, methodName: <string>, args: []<string>,
 *            numOutArgs: <int> } =>
 *          { response: <undefined, output, OR []outputs>, err: <err> }
 */
// TODO(alexfandrianto): Make this configurable here and on the Go end.
// https://github.com/vanadium/issues/issues/1268
var eventSourceURL = 'http://127.0.0.1:9002';
function connectToEventSource(requestType, parameters) {
  parameters = parameters || '';
  var requestData = eventSourceURL +
    '?request=' + encodeURIComponent(requestType) +
    '&params=' + encodeURIComponent(JSON.stringify(parameters));

  // Create the EventSource. Note: node does not have EventSource.
  return new EventSource(requestData); // jshint ignore:line
}

/*
 * Returns a Promise<value> drawn from the connected Event Source.
 * See connectToEventSource.
 */
function getSingleEvent(type, params, field) {
  return new Promise(function(resolve, reject) {
    var ev = connectToEventSource(type, params);
    ev.addEventListener('message', function(message) {
      ev.close();
      try {
        var data = JSON.parse(message.data);
        if (data.err) {
          reject(data.err);
        } else {
          resolve(data[field]);
        }
      } catch (err) {
        reject(err);
      }
    });
    ev.addEventListener('error', function(err) {
      ev.close();
      reject(err);
    });
  });
}

/*
 * Returns the accountName for the currently logged in user
 * @return {Promise.<string>}
 */
var _accountNamePromise;
function getAccountName() {
  if (!_accountNamePromise) {
    _accountNamePromise =
      getSingleEvent('accountName', undefined, 'accountName');
  }
  return _accountNamePromise;
}

/*
 * Returns the email address for the currently logged in user
 * @return {Promise.<string>}
 */
function getEmailAddress() {
  return getAccountName().then(function(accountName) {
    // TODO(alexfandrianto): Assumes a lot about the format of the blessings.
    return accountName.split(':')[2];
  });
}

/*
 * globCache holds (name + globQuery, result) cache entry for
 * GLOB_CACHE_MAX_SIZE items in an LRU cache
 */
var GLOB_CACHE_MAX_SIZE = 10000;
var GLOB_CACHE_PREFIX = 'glob|';
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
  var cacheKey = GLOB_CACHE_PREFIX + pattern;
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
  var globItemsObservArrPromise =
    Promise.resolve().then(function callGlobOnNamespace() {
      return new Promise(function (resolve, reject) {
        var ev = connectToEventSource('glob', pattern);
        ev.addEventListener('error', function(err) {
          ev.close();
          reject(err);
        });

        function handleMessageConnectionResponse(response) {
          try {
            var data = JSON.parse(response.data);
            if (data.err) {
              ev.close();
              reject(data.err);
            } else {
              // We have successfully established the stream.
              // Keep the event source open to listen for more.
              resolve();
            }
          } catch (err) {
            ev.close();
            reject(err);
          }
        }

        function handleStreamEvent(message) {
          try {
            var data = JSON.parse(message.data);

            if (data.globRes) {
              var globResult = data.globRes;

              // Handle a glob result by creating an item.
              var item = createNamespaceItem(lowercasifyJSONObject(globResult));

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

            } else if (data.globErr) {
              var err = data.globErr;
              // Handle a glob error by emitting that event.
              immutableResult.events.emit('globError', err);
              log.warn('Glob stream error', err);
            } else if (data.globEnd) {
              // Handle a glob end by emitting it. Close event source.
              immutableResult.events.emit('end');
              immutableResult._hasEnded = true;
              ev.close();
            } else {
              // There was a data error. Close event source.
              log.error('Event source error for', name, data.err);
              ev.close();

              // If this were an RPC, we probably would have failed earlier.
              // So, we must also clear the cache key.
              globCache.del(cacheKey);
            }
          } catch (err) {
            log.error(err);
          }
        }

        var initialResponse = false;
        ev.addEventListener('message', function(response) {
          if (!initialResponse) {
            // Check whether the RPC and stream connection was established.
            initialResponse = true;
            handleMessageConnectionResponse(response);
          } else {
            // Handle the Glob Results and Errors from the stream.
            handleStreamEvent(response);
          }
        });
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
  return getSingleEvent('permissions', name, 'permissions').then(
    function(perms) {
      // perms is an object, but we want a map instead.
      var p2 = new Map();
      for (var key in perms) {
        if (perms.hasOwnProperty(key)) {
          p2.set(key, lowercasifyJSONObject(perms[key]));
        }
      }
      return mercury.value(p2);
  });
}



/*
 * Deletes a mount point.
 * @param {string} name mountpoint name to delete.
 * @return {Promise<void>} Success or failure promise.
 */
function deleteMountPoint(name) {
  // Note: The return value on success is undefined.
  return getSingleEvent('deleteMountPoint', name, 'deleteMountPoint');
}

/*
 * Given a name, provide information about its mounttable objectAddress.
 * @param {string} objectName Object name to get mounttable objectAddress for.
 * @return {Promise.<mercury.array<string>>} Promise of an array of
 * objectAddress strings.
 */
function resolveToMounttable(name) {
  return getSingleEvent('resolveToMounttable', name, 'addresses').then(
    function(objectAddresses) {
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
  return getSingleEvent('objectAddresses', name, 'addresses').then(
    function(objectAddresses) {
      return mercury.array(objectAddresses);
  });
}

/*
 * remoteBlessingsCache holds (name, []string) cache entry for
 * REMOTE_BLESSINGS_CACHE_MAX_SIZE items in an LRU cache
 */
var REMOTE_BLESSINGS_CACHE_MAX_SIZE = 10000;
var REMOTE_BLESSINGS_PREFIX = 'getRemoteBlessings|';
var remoteBlessingsCache = new LRU({
  max: REMOTE_BLESSINGS_CACHE_MAX_SIZE
});

/*
 * Given an object name, returns a promise of the service's remote blessings.
 * @param {string} objectName Object name to get remote blessings for
 * @return {[]string} remoteBlessings The service's remote blessings.
 */
function getRemoteBlessings(objectName) {
  var cacheKey = REMOTE_BLESSINGS_PREFIX + objectName;
  var cacheHit = remoteBlessingsCache.get(cacheKey);
  if (cacheHit) {
    return Promise.resolve(cacheHit);
  }
  return getSingleEvent('remoteBlessings', objectName, 'blessings').then(
    function cacheAndReturnRemoteBlessings(remoteBlessings) {
      // Remote Blessings is []string of the service's blessings.
      remoteBlessingsCache.set(cacheKey, remoteBlessings);
      return remoteBlessings;
  });
}

/*
 * signatureCache holds (name, signature) cache entry for
 * SIGNATURE_CACHE_MAX_SIZE items in an LRU cache
 */
var SIGNATURE_CACHE_MAX_SIZE = 10000;
var SIGNATURE_CACHE_PREFIX = 'getSignature|';
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
  var cacheKey = SIGNATURE_CACHE_PREFIX + objectName;
  var cacheHit = signatureCache.get(cacheKey);
  if (cacheHit) {
    return Promise.resolve(cacheHit);
  }
  return getSingleEvent('signature', objectName, 'signature').then(
    function cacheAndReturnSignature(signature) {
      // Signature is []interface; each interface contains method data.
      signatureCache.set(cacheKey, signature);
      return signature;
  });
}

// Go through the JSON object and lowercase everything recursively.
// We need this because it is annoying to change every Go struct to have the
// json annotation to lowercase its field name.
function lowercasifyJSONObject(obj) {
  // number, string, boolean, or null
  if (typeof obj !== 'object' || obj === null) {
    return obj; // It's actually primitive.
  }

  // array
  if (Array.isArray(obj)) {
    var a = [];
    for (var i = 0; i < obj.length; i++) {
      a[i] = lowercasifyJSONObject(obj[i]);
    }
    return a;
  }

  // object
  var cp = {};
  for (var k in obj) {
    if (obj.hasOwnProperty(k)) {
      var lowerK = k[0].toLowerCase() + k.substr(1);
      cp[lowerK] = lowercasifyJSONObject(obj[k]);
    }
  }
  return cp;
}

/*
 * Make an RPC call on a service object.
 * name: string representing the name of the service
 * methodName: string for the service method name
 * args (optional): array of arguments for the service method
 */
function makeRPC(name, methodName, args, numOutArgs) {
  log.debug('Calling', methodName, 'on', name, 'with', args, 'for', numOutArgs);
  var call = {
    name: name,
    methodName: methodName,
    args: args,
    numOutArgs: numOutArgs
  };
  return getSingleEvent('makeRPC', call, 'response').then(function (result) {
    // If the result was for 0 outArg, then this returns undefined.
    // If the result was for 1 outArg, then it gets a single output.
    // If the result was for >1 outArgs, then we return []output.
    if (numOutArgs === 0) {
      return;
    } else if (numOutArgs === 1) {
      return result[0];
    }
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
  var hasServers = (mountEntry.servers && mountEntry.servers.length > 0);

  var hasServer = hasServers || !mountEntry.servesMountTable;
  var hasMountPoint = hasServers || mountEntry.servesMountTable;
  var isMounttable = hasServers && mountEntry.servesMountTable;

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
 * For example, if name is '/ns.dev.v.io:8101/global/rps'
 * returns ['ns.dev.v.io:8101', 'global', 'rps']
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

/*
 * Clears all caches (glob, signature, etc...) for the given name and all of its
 * descendants.
 * @param {string} parentName Name to clear caches for. If no name is given, all
 * caches are cleared.
 */
function clearCache(parentName) {
  if (!parentName) {
    globCache.reset();
    remoteBlessingsCache.reset();
    signatureCache.reset();
    return;
  }

  clearByPrefix(globCache, GLOB_CACHE_PREFIX + parentName);
  clearByPrefix(remoteBlessingsCache, REMOTE_BLESSINGS_PREFIX + parentName);
  clearByPrefix(signatureCache, SIGNATURE_CACHE_PREFIX + parentName);

  function clearByPrefix(cache, parent) {
    var keys = cache.keys();
    keys.forEach(function(key) {
      if (prefixes(parent, key)) {
        cache.del(key);
      }
    });
  }
}

/*
 * Returns true iff parentName is a parent of childName or is same as childName
 */
function prefixes(parentName, childName) {
  return (parentName === childName) ||
    (childName.indexOf(naming.clean(parentName) + '/') === 0);
}