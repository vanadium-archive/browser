// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var insertCss = require('insert-css');
var extend = require('extend');

var polymerEvent = require('../../../../lib/mercury/polymer-event');
var expand = require('./expand');
var getServiceIcon = require('../../get-service-icon');

var ItemTypes = require('../../../../services/namespace/item-types');

var css = require('./index.css');
var h = mercury.h;

module.exports = create;
module.exports.render = render;
module.exports.expand = expand;

function create() {

  var state = mercury.varhash({
    /*
     * Map of objectNames to child namespace items
     * @see services/namespace/item
     * @type {varhash<string,Array<namespaceitem>>}
     * Always contains the children for every item in the tree (including
     *   leaf nodes) so we can know whether to display the expand icon
     */
    childrenMap: mercury.varhash({}),

    /*
     * Map of objectNames to Boolean flag showing if tree view is expanded
     * @type {varhash<string,Boolean>}
     * For each item, says whether it is expanded in the tree view.
     * If there is no value, assumes false.
     */
    expandedMap: mercury.varhash({}),

    /*
     * Map of objectNames to Boolean flag for whether this is being loaded.
     * @type {varhash<string,Boolean>}
     * If the item is not present, it is not considered to be loading.
     */
    isLoadingMap: mercury.varhash({}),

    /*
     * The current item to be used as the root of the tree
     * @see services/namespace/item
     * @type {namespaceitem}
     */
    rootItem: mercury.value(null)
  });

  var events = mercury.input([
    'openChange', // expand / collapse of tree node
    'activate' // tap on tree node
  ]);

  wireUpEvents(state, events);

  return {
    state: state,
    events: events
  };
}

function render(state, events, browseState, browseEvents) {
  insertCss(css);

  var item = state.rootItem; // start at the root
  if (item === null) {
    return;
  } // TODO(wm) Maybe show "Loading..."?

  var rootEvents = { // events to attach to root of tree
    'ev-openchange': polymerEvent(events.openChange),
    'ev-activate': polymerEvent(
      events.activate, {
        browseEvents: browseEvents
      }
    )
  };
  return h('div#tree-container',
    createTreeNode(state, browseState.selectedItemName, item, rootEvents)
  );
}

/*
 * Recursively render tree from the bottom up
 * Has to be from bottom up because virtual DOM is immutable.
 * events is extra properties to add (used for root events)
 */
function createTreeNode(state, selected, item, extraprops) {
  var childrenArr = state.childrenMap[item.objectName];
  var descendants = []; // all viewed descendants of this item
  if (childrenArr) {
    descendants = childrenArr.map(function(child) {
      return createTreeNode(state, selected, child);
    });
  }
  var clName = (item.itemType === ItemTypes.inaccessible ? '.grayed-out' : '');
  var iconInfo = getServiceIcon(item);
  var props = {
    attributes: {
      label: item.mountedName || '<Home>',
      icon: iconInfo.icon,
      itemTitle: iconInfo.title,
      open: !!state.expandedMap[item.objectName],
      highlight: (item.objectName === selected),
      isExpandable: item.isGlobbable,
      loading: state.isLoadingMap[item.objectName]
    },
    objectName: item.objectName
  };
  if (extraprops) { // root of tree
    extend(props, extraprops);
  }
  return h('tree-node' + clName , props, descendants);
}

function wireUpEvents(state, events) {
  // expand or collapse item
  events.openChange(function(data) {
    var objectName = data.polymerDetail.node.objectName;
    var openMe = data.polymerDetail.node.open;
    if (openMe) {
      expand(state, objectName);
    } else { // collapse this item
      state.expandedMap.delete(objectName);
    }
  });
  // highlight item and display details
  events.activate(function(data) {
    var objectName = data.polymerDetail.node.objectName;
    data.browseEvents.selectItem({
      name: objectName
    });
  });
}
