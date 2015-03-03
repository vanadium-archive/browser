var mercury = require('mercury');
var insertCss = require('insert-css');

var polymerEvent = require('../../../lib/mercury/polymer-event');

var methodNameToVarHashKey = require('./methodNameToVarHashKey');
var PluginWidgetAdapter = require('./plugin-widget-adapter');

var browseRoute = require('../../../routes/browse');

var displayItemDetails = require('./display-item-details');
var bookmark = require('./bookmark');

var methodForm = require('./method-form/index');
var ErrorBox = require('../../error/error-box/index');

var namespaceUtil = require('../../../services/namespace/service').util;
var ItemTypes = require('../../../services/namespace/item-types');

var css = require('./index.css');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * ItemDetails component provides user interfaces for displaying details for
 * a browse item such is its type, signature, etc.
 */
function create() {
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
     * Any fatal error while getting the details.
     * Note: will be displayed to user.
     * @type Error
     */
    error: mercury.value(null),

    /*
     * remoteBlessings for the item. []string
     * @type {[]string}
     */
    remoteBlessings: mercury.value(null),

    /*
     * signature for the item. []interface
     * @see services/namespace/interface-util
     * @type {signature}
     */
    signature: mercury.value(null),

    /*
     * Which tab to display. Key is a unique string e.g. ('details' or <plugin>)
     * @type {string}
     */
    selectedTabKey: mercury.value(null),

    /*
     * An associative array from item names to method outputs.
     * The outputs are in RPC call-order and store render information.
     * @type {map[string]Array<Object>}
     */
    methodOutputs: mercury.varhash(),

    /*
     * Each method form corresponds to an interface in the signature. It is a
     * map from method names to the relevant state used in the method-form
     * component.
     * @type {[]map[string]mercury.struct}
     */
    methodForms: mercury.array([]),

    /*
     * Each method form could be open or closed. All start out open, except
     * for __Reserved, which is explicitly set to closed.
     * @type {[]boolean}
     */
    methodFormsOpen: mercury.array([]),

    /*
     * Whether a loading indicator should be displayed instead of content
     * @type {mercury.value<boolean>}
     */
    showLoadingIndicator: mercury.value(false),

    /*
     * Whether item is bookmarked
     * @type {mercury.value<boolean>}
     */
    isBookmarked: mercury.value(false),

    /*
     * List of item plugins supported for this item
     * @type {itemplugin}
     * @see {item-plugins/plugin.js.doc}
     */
    plugins: mercury.array([])
  });

  var events = mercury.input([
    'bookmark',
    'displayItemDetails',
    'tabSelected',
    'methodForms',
    'toggleMethodForm',
    'toast'
  ]);

  wireUpEvents(state, events);

  // events.methodForms is []events; the index order matches state.methodForms
  // and state.methodFormsOpen.
  events.methodForms = [];

  return {
    state: state,
    events: events
  };
}

var DETAILS_TAB_KEY = 'details';

/*
 * Render the item details page, which includes tabs for details and methods.
 */
function render(state, events, browseState, navEvents) {
  insertCss(css);

  var tabTitles = renderTabTitles(state, events);

  var selectedTabContent =
    renderSelectedTabContent(state, events, browseState, navEvents);

  return [
    h('paper-tabs.tabs', {
      attributes: {
        'valueattr': 'tabkey',
        'selected': (state.selectedTabKey || DETAILS_TAB_KEY),
        'noink': true
      }
    }, tabTitles),
    selectedTabContent
  ];
}

/*
 * Renders the tab titles such as details and tabs for support plugins
 * It uses the plugins id as the tab key
 */
function renderTabTitles(state, events) {
  // Details tab
  var detailsTabTitle = (namespaceUtil.basename(state.itemName) || '<root>');
  var detailsTab =
    renderTabTitle(state, events, DETAILS_TAB_KEY, detailsTabTitle);

  // Plugin tabs
  var pluginTabs = state.plugins.map(function(p) {
    var pluginTabKey = p.id;
    return renderTabTitle(state, events, pluginTabKey, p.title);
  });

  var allTabs = [detailsTab].concat(pluginTabs);

  return allTabs;
}

/*
 * Renders the selected tab content.
 */
function renderSelectedTabContent(state, events, browseState, navEvents) {
  var selectedTabKey = state.selectedTabKey || DETAILS_TAB_KEY;
  switch (selectedTabKey) {
    case DETAILS_TAB_KEY:
      return renderDetailsTabContent(state, events, browseState, navEvents);
    default:
      // potentially a plugin tab
      var plugin = state.plugins.filter(function(p) {
        return p.id === selectedTabKey;
      })[0];
      if (plugin) {
        var view = new PluginWidgetAdapter(state.itemName, plugin);
        return renderTabContent(view);
      } else {
        throw 'Unknown tab key: ' + selectedTabKey;
      }
  }
}

/*
 * Render tab content for the details tab
 */
function renderDetailsTabContent(state, events, browseState, navEvents) {
  var tabContent = [];

  // Details can only be shown if there is an item.
  if (state.item) {
    var detailsContent = renderDetailsContent(state, events);
    tabContent.push(detailsContent);
  }

  // The method forms can only be shown under these conditions.
  if (state.item && state.item.itemType === ItemTypes.server &&
    state.signature) {
    var methodsContent = renderMethodsContent(state, events);
    tabContent.push(methodsContent);
  }

  // Show any errors from getting the details and/or the item itself
  var error;
  if (state.item && state.item.itemType === ItemTypes.inaccessible &&
    state.item.itemError) {
    error = state.item.itemError;
  }
  if (state.error) {
    error = error + '\n\n' + state.error.toString();
  }

  if (error) {
    var errorTitle = 'Unable to connect to ' + state.itemName;
    tabContent.push(ErrorBox.render(errorTitle, error));
  }

  // Show the loading indicator if it's available.
  if (state.showLoadingIndicator) {
    tabContent.push(h('paper-spinner', {
      attributes: {
        'active': true,
        'aria-label': 'Loading'
      }
    }));
  }

  // The header is always rendered.
  var headerContent = renderHeaderContent(state, events, browseState,
    navEvents);

  return renderTabContent([headerContent, tabContent]);
}

/*
 * Render tab title given a title string and tab key
 */
function renderTabTitle(state, events, tabKey, title) {
  return h('paper-tab.tab', {
    attributes: {
      'tabkey': tabKey
    },
    'ev-click': new polymerEvent(function(data) {
      events.tabSelected({
        tabKey: data.target.getAttribute('tabkey')
      });
    })
  }, title);
}

/*
 * Render tab content given the tabContent by wrapping it in a container
 */
function renderTabContent(tabContent) {
  return h('div.tab-content', tabContent);
}

/*
 * Renders an action bar on top of the details panel page.
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
    var parentName = parent || '<root>';
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
  // This action only appears if this item is globbable and distinct from the
  // current namespace.
  var isGlobbable = state.item ? state.item.isGlobbable : false;
  if (browseState.namespace !== state.itemName && isGlobbable) {
    var browseUrl = browseRoute.createUrl(browseState, {
      namespace: state.itemName
    });
    var itemName = state.itemName || '<root>';
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
 * Renders the header which includes actions and name field.
 * Header is always displayed, even during loading time or when we fail
 * to load details for an item.
 * Note: we should be able to render header without loading signature. Any
 * information about the item other than name and whether it is bookmarked.
 */
function renderHeaderContent(state, events, browseState, navEvents) {
  var actions = renderActions(state, events, browseState, navEvents);
  var headerItems = [
    actions,
    renderFieldItem('Full Name', (state.itemName || '<root>')),
  ];
  return headerItems;
}

/*
 * Renders details about the current service object.
 * Assumes that there is a state.item
 * Note: Currently renders in the same tab as renderMethodsContent.
 */
function renderDetailsContent(state, events) {
  var displayItems = [];
  displayItems.push(renderTypeFieldItem(state));
  if (state.item.itemType === ItemTypes.server) {
    displayItems.push(renderEndpointsFieldItem(state));
    if (state.remoteBlessings) {
      displayItems.push(renderRemoteBlessingsFieldItem(state));
    }
  }
  return [
    h('div', displayItems)
  ];
}

/*
 * Renders the Type Field Item. Includes the type name of the service and its
 * description. Non-servers receive a default type name instead.
 */
function renderTypeFieldItem(state) {
  var item = state.item;
  var typeName;
  var typeDescription;
  if (item.itemType === ItemTypes.server) {
    typeName = item.serverInfo.typeInfo.typeName;
    typeDescription = item.serverInfo.typeInfo.description;
  } else if(item.itemType === ItemTypes.intermediary) {
    typeName = 'Intermediary Name';
  } else if(item.itemType === ItemTypes.inaccessible) {
    typeName = 'Inaccessible';
  } else {
    typeName = 'Loading';
  }

  return renderFieldItem('Type', typeName, {
    contentTooltip: typeDescription
  });
}

/*
 * Renders the Endpoints Field Item, a simple listing of the server's endpoints.
 */
function renderEndpointsFieldItem(state) {
  var item = state.item;
  var endpointDivs;
  if (item.serverInfo.endpoints.length === 0) {
    endpointDivs = [
      h('div', h('span', 'No endpoints found'))
    ];
  } else {
    // Show 1 div per server endpoint.
    endpointDivs = item.serverInfo.endpoints.map(function(endpoint) {
      return h('div', h('span', endpoint));
    });
  }
  return renderFieldItem('Endpoints', h('div', {
    attributes: {
      'vertical': true,
      'layout': true
    }
  }, endpointDivs));
}

/*
 * Renders the Remote Blessings Field Item, a list of the server's blessings.
 * Does not appear until the data has been fetched.
 */
function renderRemoteBlessingsFieldItem(state) {
  var remoteBlessings = state.remoteBlessings;
  var blessingDivs;
  if (remoteBlessings.length === 0) {
    blessingDivs = [
      h('div', h('span', 'No blessings found'))
    ];
  } else {
    // Show 1 div per blessing.
    blessingDivs = remoteBlessings.map(function(blessing) {
      return h('div', h('span', blessing));
    });
  }
  return renderFieldItem('Remote Blessings', h('div', {
    attributes: {
      'vertical': true,
      'layout': true
    }
  }, blessingDivs));
}

/*
 * Renders the method signature forms and the RPC output area.
 * Does not appear until the data has been fetched.
 */
function renderMethodsContent(state, events) {
  var sig = state.signature;
  if (!sig || sig.size === 0) {
    return renderFieldItem('Methods',
      h('div', h('span', 'No method signature')));
  }

  // Render each interface and an output region.
  var content = state.signature.map(function(interface, interfaceIndex) {
    var label = interface.pkgPath + '.' + interface.name;
    var content;
    var open = state.methodFormsOpen[interfaceIndex];
    var options = {
      labelTooltip: interface.doc,
      collapsed: !open,
      callback: events.toggleMethodForm.bind(null, {
        index: interfaceIndex,
        value: !open
      })
    };
    if (!open) {
      content = h('span');
    } else {
      content = renderMethodInterface(state, events, interfaceIndex);
    }
    return renderFieldItem(label, content, options);
  });
  content.push(renderFieldItem('Output', renderMethodOutput(state)));

  return h('div', content);
}

/*
 * Renders each method signature belonging to one of the interfaces of the
 * service. Each form allows RPCs to be made to the associated service.
 */
function renderMethodInterface(state, events, interfaceIndex) {
  var methods = [];

  // Render all the methods in alphabetical order.
  // ES6 Map iterates in the order values were added, so we must sort them.
  var methodNames = [];
  state.signature[interfaceIndex].methods.forEach(
    function(methodData) {
      methodNames.push(methodData.name);
    }
  );
  methodNames.sort().forEach(function(methodName) {
    var methodKey = methodNameToVarHashKey(methodName);
    methods.push(methodForm.render(
      state.methodForms[interfaceIndex][methodKey],
      events.methodForms[interfaceIndex][methodKey]
    ));
  });

  return h('div', methods); // Note: allows 0 method signatures
}

/*
 * Renders the method outputs received by the current service object.
 * Prints each output received in reverse order; most recent is on top.
 */
function renderMethodOutput(state) {
  var outputs = state.methodOutputs[state.item.objectName];
  if (outputs === undefined) {
    return h('div.method-output', h('span', 'No method output'));
  }
  var outputRows = [h('tr', [
    h('th', '#'),
    h('th', 'Method'),
    h('th', 'Output')
  ])];
  for (var i = outputs.length - 1; i >= 0; i--) {
    var output = outputs[i];
    if (output.shouldShow) {
      outputRows.push(
        h('tr', [
          h('td', {
            'scope': 'row'
          }, '' + (i + 1)),
          h('td', h('pre', output.method)),
          h('td', h('pre', output.result))
        ])
      );
    }
  }

  var outputTable = h('table', {
    attributes: {
      'summary': 'Table showing the outputs of methods run on' +
        'the service. The results are shown in reverse order.'
    }
  }, outputRows);
  return h('div.method-output', outputTable);
}

/*TODO(aghassemi) make a web component for this*/
function renderFieldItem(label, content, options) {
  options = options || {};

  var hlabel = h('h4', label);
  var hinfo = h('span');
  if (options.labelTooltip) {
    // If there is a tooltip, create an info icon with that tooltip.
    hinfo = h('core-tooltip.tooltip.field-tooltip', {
      attributes: {
        'label': options.labelTooltip
      },
      'position': 'left'
    }, h('core-icon.icon.info', {
      attributes: {
        'icon': 'info'
      }
    }));
  }
  content = h('span', content);
  if (options.contentTooltip) {
    // If there is a tooltip, wrap the content in it.
    content = h('core-tooltip.tooltip.field-tooltip', {
      attributes: {
        'label': options.contentTooltip
      },
      'position': 'right'
    }, content);
  }

  var expander = h('span');
  if (options.collapsed !== undefined) {
    expander = h('core-icon.icon', {
      attributes: {
        'icon': options.collapsed ? 'chevron-right' : 'expand-more'
      },
      'ev-click': options.callback
    });
  }

  return h('div.field' + (options.collapsed === true ? '.collapsed' : ''), [
    h('div.header', [
      hlabel,
      hinfo,
      expander
    ]),
    h('div.content', content)
  ]);
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.displayItemDetails(displayItemDetails.bind(null, state, events));
  events.tabSelected(function(data) {
    state.selectedTabKey.set(data.tabKey);
  });
  events.bookmark(bookmark.bind(null, state, events));
  events.toggleMethodForm(function(data) {
    state.methodFormsOpen.put(data.index, data.value);
  });
}