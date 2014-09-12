var mercury = require('mercury');

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
 * @param {boolean} obj.isServer. Whether the item points a mounted server or
 * is just an intermediary node.
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
    isServer: mercury.value(obj.isServer),
    serverInfo: obj.serverInfo
  });
}

/*
 * Creates an observable struct representing information about a server such as
 * type information, signature, etc...
 *
 * @param {mercury.struct} obj.typeInfo. Struct representing the type of the
 * server. ServerTypeInfo includes key, name, description, icon, etc..
 * @see #createServerTypeInfo method for details on typeInfo.
 * @param {object} obj.signature object representing the method signature of the
 * server.
 * @return {mercury.struct}
 */
function createServerInfo(obj) {
  return mercury.struct({
    typeInfo: obj.typeInfo,
    signature: mercury.value(obj.signature)
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
 * @param {string} [obj.icon] icon key to be displayed for this type of server
 * in the UI. e.g. 'folder'.
 * @see http://www.polymer-project.org/components/core-icons/demo.html for a
 * list of icon keys
 * @return {mercury.struct}
 */
function createServerTypeInfo(obj) {
  return mercury.struct({
    key: mercury.value(obj.key),
    typeName: mercury.value(obj.typeName),
    description: mercury.value(obj.description),
    icon: mercury.value(obj.icon),
  });
}