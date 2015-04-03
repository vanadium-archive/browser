// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');

module.exports = {
  createItem: createItem
};

/*
 * Creates an observable struct representing basic information about
 * an item in the namespace.
 *
 * @param {string} obj.objectName The full hierarchical object name of the item
 * e.g. "bar/baz/foo"
 * @param {string} obj.mountedName The nonhierarchical name of the item used
 * when it was mounted to a mounttable. e.g. "foo"
 * @param {boolean} obj.isLeaf. Whether the item can have children.
 * @param {boolean} obj.hasServer. Whether there is a server behind this name.
 * @param {boolean} obj.hasMountPoint. Whether there is a mountpoint behind this
 * name.
 * @param {boolean} obj.isMounttable. Whether the server is an mounttable server
 * @return {mercury.struct}
 */
function createItem(obj) {
  return mercury.struct({
    objectName: mercury.value(obj.objectName),
    mountedName: mercury.value(obj.mountedName),
    isLeaf: mercury.value(obj.isLeaf),
    hasServer: mercury.value(obj.hasServer),
    hasMountPoint: mercury.value(obj.hasMountPoint),
    isMounttable: mercury.value(obj.isMounttable)
  });
}