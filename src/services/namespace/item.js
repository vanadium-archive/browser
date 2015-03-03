var mercury = require('mercury');
var ItemTypes = require('./item-types');

module.exports = {
  createItem: createItem,
  createServerInfo: createServerInfo,
  createServerTypeInfo: createServerTypeInfo
};

/*
 * Creates an observable struct representing basic information about
 * an item in the namespace.
 *
 * @param {string} obj.objectName The full hierarchical object name of the item
 * e.g. "bar/baz/foo"
 * @param {string} obj.mountedName The nonhierarchical name of the item used
 * when it was mounted to a mounttable. e.g. "foo"
 * @param {boolean} obj.isGlobbable. Whether the item supports globbing.
 * Any server that supports .glob() is considered globbale.
 * @param {ItemTypes} obj.itemType. The type of the item. One of the values
 * defined in the ItemTypes enum.
 * @param {string} obj.itemError. Any error messages for the item, only set if
 * itemType === ItemTypes.Inaccessible
 * @param {mercury.struct} [obj.serverInfo]. Struct representing information
 * about the server. null if !isServer.
 * @see #createServerInfo method for details on serverInfo
 * @return {mercury.struct}
 */
function createItem(obj) {
  return mercury.struct({
    objectName: mercury.value(obj.objectName),
    mountedName: mercury.value(obj.mountedName),
    isGlobbable: mercury.value(obj.isGlobbable),
    itemType: mercury.value(obj.itemType || ItemTypes.loading),
    itemError: mercury.value(obj.itemError || ''),
    serverInfo: obj.serverInfo
  });
}

/*
 * Creates an observable struct representing type information about a server.
 *
 * @param {mercury.struct} obj.typeInfo. Struct representing the type of the
 * server. ServerTypeInfo includes key, name, description, icon, etc..
 * @param {mercury.array<string>} obj.endpoints List of the server's endpoints.
 * @see #createServerTypeInfo method for details on typeInfo.
 * @return {mercury.struct}
 */
function createServerInfo(obj) {
  return mercury.struct({
    typeInfo: obj.typeInfo,
    endpoints: obj.endpoints
  });
}

/*
 * Creates an observable struct representing information about a server type.
 * For example if a server is known to be a mounttable or a store, the struct
 * would have information such as a key, human readable name and description for
 * the type of server.
 *
 * @param {string} obj.key Unique key for the type. e.g. 'veyron-unknown',
 * 'veyron-mounttable', 'etc'.
 * @param {string} [obj.typeName] Human friendly name for the service type. e.g
 * 'Service', 'Mount Table', 'Storage'
 * @param {string} [obj.description] Human friendly description of server type.
 * @return {mercury.struct}
 */
function createServerTypeInfo(obj) {
  return mercury.struct({
    key: mercury.value(obj.key),
    typeName: mercury.value(obj.typeName),
    description: mercury.value(obj.description)
  });
}
