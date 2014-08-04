var Veyron = require('veyron');
var veyronConfig = require('../veyron-config');
var MountPoint = require('../lib/mountpoint');

var veyron = new Veyron(veyronConfig);
var namespaceUtil = Veyron.namespaceUtil;

var veyronClient = veyron.newClient();
var veyronNamespace = veyron.newNamespace();

module.exports = {
  glob: glob,
  join: join,
  signature: signature
};

/*
 * Cache of Name to MountPoint objects
 */
var cache = {
  _cacheMap: {},
  get: function(name) {
    return veyronNamespace.then(function(ns) {
      // TODO(aghassemi) why is namespace a promise?!
      if (!cache._cacheMap[name]) {
        cache._cacheMap[name] = new MountPoint(veyronClient, ns, name);
      }
      return cache._cacheMap[name];
    });
  }
};

/*
 * Given a name and a glob query, returns promise of items that match the query
 * Each item is of the form:
 * {
 *    mountedName: 'CornerThermostat' //The  mount name of the item
 *    name: 'JohnHouse/LivingRoom/CornerThermostat' //Full name of the item
 * }
 */
function glob(name, globQuery) {

  return cache.get(name).then(function glob(mountPoint) {
    return mountPoint.glob(globQuery);
  }).then(function createItems(globResults) {
    return globResults.map(function(result) {
      var itemName = result.name;
      if (name !== '') {
        itemName = namespaceUtil.join([name, itemName]);
      }
      return {
        mountedName: result.name,
        name: itemName
      };
    });
  });
}

/*
 * Given a name, returns a promise of the signature of methods available on the
 * object represented by that name.
 */
function signature(name) {
  return veyronClient.bindTo(name).then(function(service) {
    return service.signature();
  });
}

/*
 * Given a name and a suffix, it joins them to create a single name
 */
function join(name, suffix) {
  return namespaceUtil.join(name, suffix);
}