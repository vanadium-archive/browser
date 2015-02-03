var mercury = require('mercury');
var insertCss = require('insert-css');

var methodNameToVarHashKey = require('./methodNameToVarHashKey');

var browseRoute = require('../../../routes/browse');

var displayItemDetails = require('./display-item-details');
var bookmark = require('./bookmark');

var methodForm = require('./method-form/index');
var ErrorBox = require('../../error/error-box/index');

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
     * signature for the item.
     * It's a map with extra information.
     * @see services/namespace/signature-adapter
     * @type {signature}
     */
    signature: mercury.value(null),

    /*
     * Which tab to display; 0 is for service details
     * TODO(alexfandrianto): Once we have more info to display, add more tabs.
     * We are currently combining service details, methods, and outputs.
     * TODO(alexfandrianto): Use an enum instead of a comment to clarify the
     * mapping between tab name and tab index.
     * @type {integer}
     */
    selectedTabIndex: mercury.value(0),

    /*
     * An associative array from item names to method outputs.
     * The outputs are in RPC call-order and store render information.
     * @type {map[string]Array<Object>}
     */
    methodOutputs: mercury.varhash(),

    /*
     * The method form has information for each service object. It maps method
     * names to the relevant state used in the renderMethod module.
     * @type {map[string]mercury.struct}
     */
    methodForm: mercury.varhash(),

    /*
     * Whether a loading indicator should be displayed instead of content
     * @type {mercury.value<boolean>}
     */
    showLoadingIndicator: mercury.value(false),

    /*
     * Whether item is bookmarked
     * @type {mercury.value<boolean>}
     */
    isBookmarked: mercury.value(false)
  });

  var events = mercury.input([
    'bookmark',
    'displayItemDetails',
    'tabSelected',
    'methodForm',
    'toast'
  ]);

  wireUpEvents(state, events);
  events.methodForm = mercury.varhash();

  return {
    state: state,
    events: events
  };
}

/*
 * Render the item details page, which includes tabs for details and methods.
 */
function render(state, events, browseState, navEvents) {
  insertCss(css);

  var tabContent;

  if (state.showLoadingIndicator) {
    tabContent = h('paper-spinner', {
      attributes: {
        'active': true,
        'aria-label': 'Loading'
      }
    });
  } else if (state.item) {
    var detailsContent = renderDetailsContent(state, events);

    var methodsContent;
    if (state.item.isServer) {
      methodsContent = renderMethodsContent(state, events);
    }
    tabContent = [detailsContent, methodsContent];
  } else if (state.error) {
    var errorTitle = 'Unable to connect to ' + state.itemName;
    tabContent = ErrorBox.render(errorTitle, state.error.toString());
  }

  var headerContent = renderHeaderContent(state, events, browseState,
    navEvents);
  var formattedTabTitle = (namespaceUtil.basename(state.itemName) || '<root>');
  return [h('paper-tabs.tabs', {
      attributes: {
        'selected': state.selectedTabIndex,
        'noink': true
      }
    }, [
      h('paper-tab.tab', {
        'ev-click': mercury.event(events.tabSelected, {
          index: 0
        })
      }, formattedTabTitle)
    ]),
    h('core-selector', {
      attributes: {
        'selected': state.selectedTabIndex
      }
    }, [
      h('div.tab-content', [headerContent, tabContent]),
    ])
  ];
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
 * Note: we should be able to render header without loading signature any
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
 * Note: Currently renders in the same tab as renderMethodsContent.
 */
function renderDetailsContent(state, events) {
  var displayItems = [];
  displayItems.push(renderTypeFieldItem(state));
  if (state.item.isServer) {
    displayItems.push(renderEndpointsFieldItem(state));
    if (state.signature) {
      displayItems.push(renderInterfacesFieldItem(state));
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
  if (item.isServer) {
    typeName = item.serverInfo.typeInfo.typeName;
    typeDescription = item.serverInfo.typeInfo.description;
  } else {
    typeName = 'Intermediary Name';
  }

  return renderFieldItem('Type', typeName, typeDescription);
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
 * Renders the Interfaces Field Item, a listing of the interfaces that the
 * server implements, including VDL descriptions of the interfaces.
 */
function renderInterfacesFieldItem(state) {
  var serviceDescDivs;
  var descs = state.signature.pkgNameDescriptions;
  var pkgNames = Object.keys(descs);
  if (pkgNames.length === 0) {
    serviceDescDivs = [
      h('div', h('span', 'No interfaces implemented'))
    ];
  } else {
    // Go through each pkgName and show the tooltip for that interface.
    serviceDescDivs = pkgNames.map(function(pkgName) {
      var desc = descs[pkgName];

      return h('div', [
        h('core-tooltip.tooltip.field-tooltip', {
          'label': desc || '<no description>',
          'position': 'right'
        }, h('core-icon.icon.info', {
          attributes: {
            'icon': 'info'
          }
        })),
        h('span.margin-left-xxsmall', pkgName)
      ]);
    });
  }

  return renderFieldItem('Interfaces', h('div', {
    attributes: {
      'vertical': true,
      'layout': true
    }
  }, serviceDescDivs));
}

/*
 * Renders the method signature forms and the RPC output area.
 * Note: Currently renders in the same tab as renderDetailsContent.
 */
function renderMethodsContent(state, events) {
  return h('div', [
    renderFieldItem('Methods', renderMethodSignatures(state, events)),
    renderFieldItem('Output', renderMethodOutput(state))
  ]);
}

/*
 * Renders each method signature with associated form for entering inputs and
 * making RPCs to the associated service.
 */
function renderMethodSignatures(state, events) {
  var sig = state.signature;
  if (!sig || sig.size === 0) {
    return h('div', h('span', 'No method signature'));
  }

  var methods = [];

  // Render all the methods in alphabetical order.
  // ES6 Map iterates in the order values were added, so we must sort them.
  var methodNames = [];
  sig.forEach(function(methodData, methodName) {
    methodNames.push(methodName);
  });
  methodNames.sort().forEach(function(methodName) {
    var methodKey = methodNameToVarHashKey(methodName);
    methods.push(methodForm.render(
      state.methodForm[methodKey],
      events.methodForm[methodKey]
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
function renderFieldItem(label, content, tooltip) {
  var hlabel = h('h4', label);
  content = h('span', content);
  if (tooltip) {
    // If there is a tooltip, wrap the content in it
    content = h('core-tooltip.tooltip.field-tooltip', {
      attributes: {
        'label': tooltip
      },
      'position': 'right'
    }, content);
  }

  return h('div.field', [
    h('h4', hlabel),
    h('div.content', content)
  ]);
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.displayItemDetails(displayItemDetails.bind(null, state, events));
  events.tabSelected(function(data) {
    state.selectedTabIndex.set(data.index);
  });
  events.bookmark(bookmark.bind(null, state, events));
}
