// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var insertCss = require('insert-css');

var PolymerEvent = require('../../../lib/mercury/polymer-event');
var displayItemDetails = require('./display-item-details');

var browseRoute = require('../../../routes/browse');

var bookmark = require('./bookmark');
var PluginWidgetAdapter = require('./plugin-widget-adapter');

var ErrorBox = require('../../error/error-box');
var ServerDetails = require('./server-details');
var MountPointDetails = require('./mount-point-details');

var namespaceUtil = require('../../../services/namespace/service').util;

var css = require('./index.css');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * ItemDetails component provides user interfaces for displaying details for
 * a browse item such is its type, signature, etc.
 */
function create() {
  var serverDetailsComponent = new ServerDetails();
  var mountPointDetailsComponent = new MountPointDetails();

  var state = mercury.varhash({

    /*
     * objectName for the item we are showing details of.
     * We keep this in addition to item.objectName since item object may not be
     * present (when in the middle of loading or when failed to load).
     * Keeping itemName separate allows us to render a header with add/remove
     * bookmark actions even when item is loading or has failed to load.
     * @type {string}
     */
    itemName: mercury.value(''),

    /*
     * namespace item to display details for.
     * @see services/namespace/item
     * @type {namespaceitem}
     */
    item: mercury.value(null),

    /*
     * Which tab to display. Key is a unique string e.g. ('details' or <plugin>)
     * @type {string}
     */
    selectedTabKey: mercury.value(null),

    /*
     * List of item plugins supported for this item
     * @type {itemplugin}
     * @see {item-plugins/plugin.js.doc}
     */
    plugins: mercury.array([]),

    /*
     * Any fatal error while getting the item.
     * Note: will be displayed to user.
     * @type Error
     */
    error: mercury.value(null),

    /*
     * State for the serverDetails component
     * @type {mercury.struct}
     */
    serverDetails: serverDetailsComponent.state,

    /*
     * State for the mountPointDetails component
     * @type {mercury.struct}
     */
    mountPointDetails: mountPointDetailsComponent.state,

    /*
     * Whether the items is bookmarked or not
     * @type {boolean}
     */
    isBookmarked: mercury.value(false)
  });

  var events = mercury.input([
    'bookmark',
    'displayItemDetails',
    'tabSelected',
    'toast',
    'serverDetails',
    'mountPointDetails'
  ]);

  events.serverDetails = serverDetailsComponent.events;
  events.mountPointDetails = mountPointDetailsComponent.events;
  wireUpEvents(state, events);

  return {
    state: state,
    events: events
  };
}

var DETAILS_TAB_KEY = 'details';
var MOUNTPOINT_TAB_KEY = 'mountpoint';

/*
 * Render the actions and tabs.
 */
function render(state, events, browseState, navEvents) {
  insertCss(css);

  var content = [];

  // The header is always rendered and contains actions and name of the item.
  var headerContent = renderHeaderContent(state, events, browseState,
    navEvents);

  content.push(headerContent);

  if (state.item) {
    var tabTitles = renderTabTitles(state, events);

    var selectedTabContent =
      renderSelectedTabContent(state, events, browseState, navEvents);

    var tabs = [h('paper-tabs.tabs', {
        attributes: {
          'valueattr': 'tabkey',
          'selected': getSelectedTabKey(state),
          'noink': true
        }
      }, tabTitles),
      selectedTabContent
    ];

    content.push(tabs);
  }

  // Show any errors from getting the item
  if (state.error) {
    var errorTitle = 'Unable to resolve ' + state.itemName;
    content.push(
      h('div.padded-error-box',
        ErrorBox.render(errorTitle, state.error.toString())
      )
    );
  }

  return content;
}

/*
 * Renders the header which includes actions and name field.
 * Header is always displayed, even during loading time or when we fail
 * to load details for an item.
 * Note: we should be able to render header without loading signature. Any
 * information about the item other than name and whether it is bookmarked.
 */
function renderHeaderContent(state, events, browseState, navEvents) {
  var actions = renderActions(state, events, browseState, navEvents);
  var name = namespaceUtil.basename(state.itemName) || '<Home>';
  var headerItems = h('div.sidebar-header', [
    actions,
    h('div.name-title', name)
  ]);
  return headerItems;
}

/*
 * Renders an action bar on top of the tabs.
 */
function renderActions(state, events, browseState, navEvents) {

  // Collect a list of actions.
  var actions = [];

  // Bookmark action (Add or remove a bookmark)
  var isBookmarked = state.isBookmarked;
  var bookmarkIcon = 'bookmark' + (!isBookmarked ? '-outline' : '');
  var bookmarkTitle = (isBookmarked ? 'Remove Bookmark ' : 'Add Bookmark');
  var bookmarkAction = h('core-tooltip', {
      attributes: {
        'label': bookmarkTitle,
        'position': 'right'
      }
    },
    h('paper-icon-button' + (isBookmarked ? '.bookmarked' : ''), {
      attributes: {
        'icon': bookmarkIcon,
        'alt': bookmarkTitle
      },
      'ev-click': mercury.event(events.bookmark, {
        bookmark: !isBookmarked,
        name: state.itemName
      })
    })
  );
  actions.push(bookmarkAction);

  // Browse-up action (Navigate to the namespace's parent)
  // This action only appears if the namespace's parent is not empty.
  var parent = namespaceUtil.stripBasename(browseState.namespace);
  var noParent = (parent === '' && (browseState.namespace[0] === '/' ||
    browseState.namespace === ''));
  if (!noParent) {
    var browseUpUrl = browseRoute.createUrl(browseState, {
      namespace: parent
    });
    var parentName = parent || '<Home>';
    var browseUpTitle = 'Browse up to ' + parentName;
    var browseUpAction = h('core-tooltip', {
        attributes: {
          'label': browseUpTitle,
          'position': 'right'
        }
      },
      h('a', {
        'href': browseUpUrl,
        'ev-click': mercury.event(navEvents.navigate, {
          path: browseUpUrl
        })
      }, h('paper-icon-button', {
        attributes: {
          'icon': 'undo',
          'alt': browseUpTitle
        }
      }))
    );
    actions.push(browseUpAction);
  }

  // Browse action (Navigate into this item)
  // This action only appears if this item is not a leaf and distinct from the
  // current namespace.
  var isLeaf = state.item ? state.item.isLeaf : false;
  if (browseState.namespace !== state.itemName && !isLeaf) {
    var browseUrl = browseRoute.createUrl(browseState, {
      namespace: state.itemName
    });
    var itemName = state.itemName || '<Home>';
    var browseTitle = 'Browse into ' + itemName;
    var browseAction = h('core-tooltip', {
        attributes: {
          'label': browseTitle,
          'position': 'right'
        }
      },
      h('a', {
        'href': browseUrl,
        'ev-click': mercury.event(navEvents.navigate, {
          path: browseUrl
        })
      }, h('paper-icon-button', {
        attributes: {
          'icon': 'launch',
          'alt': browseTitle
        }
      }))
    );
    actions.push(browseAction);
  }

  return h('div.icon-group.item-actions', actions);
}

/*
 * Renders the tab titles such as details and tabs for support plugins
 * It uses the plugins id as the tab key for the core-selector component.
 */
function renderTabTitles(state, events) {
  var allTabs = [];

  // Server details tab
  if (state.item && state.item.hasServer) {
    allTabs.push(
      renderTabTitle(state, events, DETAILS_TAB_KEY,
        'vanadium:service', 'Service')
    );
  }

  // Mount point tab
  if (state.item && state.item.hasMountPoint) {
    allTabs.push(
      renderTabTitle(state, events, MOUNTPOINT_TAB_KEY,
        'vanadium:mountpoint', 'MountPoint')
    );
  }

  // Plugin tabs
  var pluginTabs = state.plugins.map(function(p) {
    var pluginTabKey = p.id;
    var pluginIcon = p.icon || 'help';
    return renderTabTitle(state, events, pluginTabKey, pluginIcon, p.title);
  });

  return allTabs.concat(pluginTabs);
}

/*
 * Renders the selected tab content.
 */
function renderSelectedTabContent(state, events, browseState, navEvents) {
  var selectedTabKey = getSelectedTabKey(state);
  var view;
  switch (selectedTabKey) {
    case DETAILS_TAB_KEY:
      view = ServerDetails.render(state.serverDetails, events.serverDetails,
        browseState, navEvents);
      return renderTabContent(view);

    case MOUNTPOINT_TAB_KEY:
      view = MountPointDetails.render(state.mountPointDetails,
        events.mountPointDetails, browseState, navEvents);
      return renderTabContent(view);
    default:
      // potentially a plugin tab
      var plugin = state.plugins.filter(function(p) {
        return p.id === selectedTabKey;
      })[0];
      if (plugin) {
        view = new PluginWidgetAdapter(state.itemName, plugin);
        return renderTabContent(view);
      } else {
        throw 'Unknown tab key: ' + selectedTabKey;
      }
  }
}

/*
 * Render tab title given a title string and tab key
 */
function renderTabTitle(state, events, tabKey, icon, title) {
  return h('paper-tab.tab', {
    attributes: {
      'tabkey': tabKey
    },
    'ev-click': new PolymerEvent(function(data) {
      events.tabSelected({
        tabKey: tabKey
      });
    })
  }, [
    h('core-icon.tab-icon', {
      attributes: {
        'icon': icon,
        'alt': '' // because we have the title beside it
      }
    }), title
  ]);
}

/*
 * Render tab content given the tabContent by wrapping it in a container
 */
function renderTabContent(tabContent) {
  return h('div.tab-content', tabContent);
}

/*
 * Returns the currently selected tab key
 */
function getSelectedTabKey(state) {
  var selectedTabKey = state.selectedTabKey;
  if (!selectedTabKey) {
    if (!state.item.hasServer) {
      selectedTabKey = MOUNTPOINT_TAB_KEY;
    } else {
      selectedTabKey = DETAILS_TAB_KEY;
    }
  }
  return selectedTabKey;
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.serverDetails.toast = function(data) {
    events.toast(data);
  };
  events.mountPointDetails.toast = function(data) {
    events.toast(data);
  };
  events.bookmark(bookmark.bind(null, state, events));
  events.displayItemDetails(displayItemDetails.bind(null, state, events));
  events.tabSelected(function(data) {
    state.selectedTabKey.set(data.tabKey);
  });
}