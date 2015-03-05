var mercury = require('mercury');
var insertCss = require('insert-css');

var PropertyValueEvent = require('../../lib/mercury/property-value-event');

var exists = require('../../lib/exists');

var namespaceService = require('../../services/namespace/service');
var smartService = require('../../services/smart/service');

var browseRoute = require('../../routes/browse');
var bookmarksRoute = require('../../routes/bookmarks');
var recommendationsRoute = require('../../routes/recommendations');

var ItemDetails = require('./item-details/index');
var Items = require('./items/index');
var Bookmarks = require('./bookmarks/index');
var Recommendations = require('./recommendations/index');

var browseNamespace = require('./browse-namespace');
var getNamespaceSuggestions = require('./get-namespace-suggestions');

var log = require('../../lib/log')('components:browse');

var css = require('./index.css');
var h = mercury.h;

module.exports = create;
module.exports.render = render;
module.exports.renderHeader = renderHeader;

// While there could be any number of children at the current namespace, only
// show up to 5 suggestions at a time. Rely on the filter to find the rest.
var NAMESPACE_AUTOCOMPLETE_MAX_ITEMS = 5;

/*
 * Browse component provides user interfaces for browsing the Veyron namespace
 */
function create() {
  loadLearners();

  var selectedItemDetails = new ItemDetails();
  var bookmarks = new Bookmarks();
  var recommendations = new Recommendations();
  var items = new Items();

  var state = mercury.varhash({
    /*
     * Veyron namespace being displayed and queried
     * @type {string}
     */
    namespace: mercury.value(''),

    /*
     * Glob query applied to the Veyron namespace
     * @type {string}
     */
    globQuery: mercury.value(''),

    /*
     * List of direct descendants of the namespace input prefix.
     * Used to make suggestions when interacting with the namespace input.
     * TODO(alexfandrianto): Currently uses obj.mountedName to access the name
     * of the descendant instead of storing the name directly. Works around
     * namespaceService's glob, which updates its returned result over time.
     * @type {Array<Object>}
     */
    namespaceSuggestions: mercury.array([]),

    /*
     * The namespace input prefix is the last namespace value that triggered
     * a glob for direct descendants. Initially, it is null. Upon update of the
     * namespace input prefix, new children will be globbed.
     * @type {string | null}
     */
    namespacePrefix: mercury.value(null),

    /*
     * State of the bookmarks component
     */
    bookmarks: bookmarks.state,

    /*
     * State of the recommendation component
     */
    recommendations: recommendations.state,

    /*
     * State of the items component
     */
    items: items.state,

    /*
     * State of the selected item-details component
     */
    selectedItemDetails: selectedItemDetails.state,

    /*
     * Name of currently selected item
     */
    selectedItemName: mercury.value(''),

    /*
     * Whether loading items has finished.
     * @type {Boolean}
     */
    isFinishedLoadingItems: mercury.value(false),

    /*
     * Specifies what sub page is currently displayed.
     * One of: items, bookmarks, recommendations
     */
    subPage: mercury.value('items')

  });

  var events = mercury.input([
    /*
     * Indicates a request to browse the Veyron namespace
     * Data of form:
     * {
     *   namespace: '/namespace-root:8881/name/space',
     *   globQuery: '*',
     * }
     * is expected as data for the event
     */
    'browseNamespace',

    /*
     * Items to be shown in the current view.
     */
    'items',

    /*
     * Indicates a request to obtain the direct descendants of the given name.
     */
    'getNamespaceSuggestions',

    /*
     * Selects an item.
     * Data of form:
     * {
     *    name: 'object/name'
     * }
     */
    'selectItem',

    /*
     * Events for the ItemDetails component
     */
    'selectedItemDetails',

    /*
     * Displays an error
     * Data of should be an Error object.
     */
    'error',

    /*
     * Displays a toast
     * Data of form:
     * {
          text: 'Saved',
          type: 'error',
          action: function undo(){ // },
          actionText: 'UNDO'
     * }
     */
    'toast'
  ]);

  wireUpEvents(state, events);
  events.selectedItemDetails = selectedItemDetails.events;
  events.items = items.events;
  selectedItemDetails.events.toast = events.toast;

  return {
    state: state,
    events: events
  };
}

/*
 * Loads the learners into the smart service upon creation of this component.
 * TODO(aghassemi), TODO(alexfandrianto) Move this into service layers, similar
 * to how `learner-shortcut` is now loaded in the recommendations service.
 */
function loadLearners() {
  smartService.loadOrCreate(
    'learner-method-input',
    smartService.constants.LEARNER_METHOD_INPUT, {
      minThreshold: 0.2,
      maxValues: -1
    }
  ).catch(function(err) {
    log.error(err);
  });
  smartService.loadOrCreate(
    'learner-method-invocation',
    smartService.constants.LEARNER_METHOD_INVOCATION, {
      minThreshold: 0.25,
      maxValues: 1
    }
  ).catch(function(err) {
    log.error(err);
  });
}

/*
 * Renders the top bar of Viz where the user can specify a namespace root.
 */
function renderHeader(browseState, browseEvents, navEvents) {
  return h('div.header-content', [
    renderNamespaceBox(browseState, browseEvents, navEvents)
  ]);
}

/*
 * Renders the main body of Viz.
 * A toolbar is rendered on top of the mainView and sideView showing the current
 * position in the namespace as well as a globquery searchbox.
 * The mainView contains the shortcuts and names at this point in the namespace.
 * The sideView displays the detail information of the selected name.
 */
function render(browseState, browseEvents, navEvents) {
  insertCss(css);

  var sideView = [
    ItemDetails.render(
      browseState.selectedItemDetails,
      browseEvents.selectedItemDetails,
      browseState,
      navEvents
    )
  ];

  var mainView;
  switch (browseState.subPage) {
    case 'items':
      mainView = Items.render(browseState.items, browseEvents.items,
        browseState, browseEvents, navEvents);
      break;
    case 'bookmarks':
      mainView = Bookmarks.render(browseState.bookmarks,
        browseState, browseEvents, navEvents);
      break;
    case 'recommendations':
      mainView = Recommendations.render(browseState.recommendations,
        browseState, browseEvents, navEvents);
      break;
    default:
      log.error('Unsupported subPage ' + browseState.subPage);
  }

  // add progressbar and wrap in a container
  var progressbar;
  if (!browseState.isFinishedLoadingItems) {
    progressbar = h('core-tooltip.progress-tooltip', {
      attributes: {
        'label': 'Loading items...',
        'position': 'bottom'
      }
    }, h('paper-progress.delayed', {
      attributes: {
        'indeterminate': true,
        'aria-label': 'Loading items'
      }
    }));
  }

  mainView = h('div.browse-main-wrapper', [
    progressbar,
    mainView
  ]);

  var sideViewWidth = '50%';
  var view = [
    h('core-toolbar.browse-toolbar', [
      renderBreadcrumbs(browseState, navEvents),
      renderViewActions(browseState, navEvents)
    ]),
    h('core-drawer-panel', {
      attributes: {
        'rightDrawer': true,
        'drawerWidth': sideViewWidth,
        'responsiveWidth': '0px'
      }
    }, [
      h('core-header-panel.browse-main-panel', {
        attributes: {
          'main': true
        }
      }, [
        mainView
      ]),
      h('core-header-panel.browse-details-sidebar', {
        attributes: {
          'drawer': true
        }
      }, [
        sideView
      ])
    ])
  ];

  return h('core-drawer-panel', {
    attributes: {
      'drawerWidth': '0px'
    }
  }, [
    h('core-header-panel', {
      attributes: {
        'main': true
      }
    }, [
      view
    ])
  ]);
}

/*
 * Renders the addressbar for entering namespace
 */
function renderNamespaceBox(browseState, browseEvents, navEvents) {
  // Trigger an actual navigation event when value of the inputs change
  var changeEvent = new PropertyValueEvent(function(val) {
    var namespace = browseState.namespace;
    if (exists(val)) {
      namespace = val;
    }
    navEvents.navigate({
      path: browseRoute.createUrl(browseState, {
        namespace: namespace
      })
    });
  }, 'value', true);

  // Change the namespace suggestions if the user types into the namespace box.
  // Ideally, this would be the input event handler. See inputEvent below.
  var trueInputEvent = new PropertyValueEvent(function(val) {
    browseEvents.getNamespaceSuggestions(val);
  }, 'value', false);

  // TODO(alexfandrianto): A workaround for Mercury/Polymer. The
  // paper-autocomplete's input value updates after Mercury captures the event.
  // If we defer handling the event, then the input has time to update itself to
  // the correct, new value.
  var inputEvent = function(ev) {
    setTimeout(trueInputEvent.handleEvent.bind(trueInputEvent, ev), 0);
  };

  // The focus event also retrieves namespace suggestions.
  var focusEvent = inputEvent;

  var children = browseState.namespaceSuggestions.map(
    function renderChildItem(child) {
      return h('paper-item', child.mountedName);
    }
  );

  return h('div.namespace-box',
    h('core-tooltip.tooltip', {
        attributes: {
          'label': 'Enter a name to browse, e.g. house/living-room'
        },
        'position': 'bottom'
      },
      h('div', {
        attributes: {
          'layout': 'true',
          'horizontal': 'true'
        }
      }, [
        h('paper-icon-button.icon', {
          attributes: {
            'icon': 'refresh',
            'label': 'Reload'
          },
          'ev-click': function() {
            location.reload();
          }
        }),
        h('paper-autocomplete.autocomplete', {
          attributes: {
            'name': 'namespace',
            'value': browseState.namespace,
            'delimiter': '/',
            'flex': 'true',
            'maxItems': NAMESPACE_AUTOCOMPLETE_MAX_ITEMS
          },
          'ev-focus': focusEvent,
          'ev-input': inputEvent,
          'ev-change': changeEvent
        }, children)
      ])
    )
  );
}

function createActionIcon(tooltip, icon, href, isSelected) {
  var view = h('core-tooltip', {
      'label': tooltip,
      'position': 'bottom'
    },
    h('a', {
      attributes: {
        'href': href
      }
    }, h('paper-icon-button.icon' + (isSelected ? '.selected' : ''), {
      attributes: {
        'icon': icon
      }
    }))
  );

  return view;
}

/*
 * Renders the view switchers for different views and bookmarks, recommendations
 */
function renderViewActions(browseState, navEvents) {

  var selectedActionKey = browseState.subPage;
  if (browseState.subPage === 'items') {
    selectedActionKey = browseState.items.viewType;
  }

  var switchGroup = h('div.icon-group', [
    createActionIcon('Tree view', 'list',
      browseRoute.createUrl(browseState, {
        viewType: 'tree'
      }), selectedActionKey === 'tree'
    ),
    createActionIcon('Grid view', 'apps',
      browseRoute.createUrl(browseState, {
        viewType: 'grid'
      }), selectedActionKey === 'grid'
    ),
    createActionIcon('Visualize view', 'image:grain',
      browseRoute.createUrl(browseState, {
        viewType: 'visualize'
      }), selectedActionKey === 'visualize'
    )
  ]);
  var ruler = h('div.vertical-ruler');
  var bookmarkGroup = h('div.icon-group', [
    createActionIcon('Bookmarks', 'bookmark-outline',
      bookmarksRoute.createUrl(),
      selectedActionKey === 'bookmarks'
    ),
    createActionIcon('Recent', 'schedule',
      recommendationsRoute.createUrl(),
      selectedActionKey === 'recommendations')
  ]);
  var searchGroup = renderSearch(browseState, navEvents);
  var view = h('div', {
    attributes: {
      'layout': 'true',
      'horizontal': 'true'
    }
  }, [
    switchGroup,
    ruler,
    bookmarkGroup,
    ruler,
    searchGroup
  ]);

  return view;
}

/*
 * Renders the globquery searchbox, used to filter the globbed names.
 */
function renderSearch(browseState, navEvents) {
  // Trigger an actual navigation event when value of the inputs change
  var changeEvent = new PropertyValueEvent(function(val) {
    navEvents.navigate({
      path: browseRoute.createUrl(browseState, {
        globQuery: val,
        // TODO(aghassemi): We only support grid view for search, we could
        // potentially support other views such as tree too but it's tricky.
        viewType: 'grid'
      })
    });
  }, 'value', true);

  var clearSearch;
  if (browseState.globQuery) {
    clearSearch = h('paper-icon-button.icon.clear-search', {
      attributes: {
        'icon': 'clear',
        'label': 'Clear search'
      },
      'ev-click': mercury.event(navEvents.navigate, {
        path: browseRoute.createUrl(browseState)
      })
    });
  }
  return h('div.search-box',
    h('core-tooltip.tooltip', {
        attributes: {
          'label': 'Enter Glob query for searching, e.g., */*/a*'
        },
        'position': 'bottom'
      },
      h('div', {
        attributes: {
          'layout': 'true',
          'horizontal': 'true'
        }
      }, [
        h('core-icon.icon', {
          attributes: {
            'icon': 'search'
          }
        }),
        h('paper-input.input', {
          attributes: {
            'flex': 'true',
            'label': 'Glob Search'
          },
          'name': 'globQuery',
          'value': browseState.globQuery,
          'ev-change': changeEvent
        }),
        clearSearch
      ])
    )
  );
}

/*
 * Renders the current name being browsed, split into parts.
 * Each name part is a link to a parent.
 */
function renderBreadcrumbs(browseState, navEvents) {

  // only render the breadcrumbs for items and not bookmarks/recommendations
  if (browseState.subPage !== 'items') {
    // use a flex div to leave white-space inplace of breadcrumbs
    return h('div', {
      attributes: {
        'flex': 'true'
      }
    });
  }

  var isRooted = namespaceService.util.isRooted(browseState.namespace);
  var namespaceParts = browseState.namespace.split('/').filter(
    function(n) {
      return n.trim() !== '';
    }
  );
  var breadCrumbs = [];
  if (!isRooted) {
    // Add a relative root (empty namespace)
    var rootUrl = browseRoute.createUrl(browseState, {
      namespace: ''
    });
    breadCrumbs.push(h('li.breadcrumb-item', [
      //TODO(aghassemi) refactor link generation code
      h('a', {
        'href': rootUrl,
        'ev-click': mercury.event(navEvents.navigate, {
          path: rootUrl
        })
      }, 'Home')
    ]));
  }

  for (var i = 0; i < namespaceParts.length; i++) {
    var namePart = namespaceParts[i].trim();
    var fullName = (isRooted ? '/' : '') +
      namespaceService.util.join(namespaceParts.slice(0, i + 1));

    var url = browseRoute.createUrl(browseState, {
      namespace: fullName
    });

    var listItem = h('li.breadcrumb-item', [
      h('a', {
        'href': url,
        'ev-click': mercury.event(navEvents.navigate, {
          path: url
        })
      }, namePart)
    ]);

    breadCrumbs.push(listItem);
  }

  return h('ul.breadcrumbs', {
    attributes: {
      'flex': 'true'
    }
  }, breadCrumbs);
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.browseNamespace(browseNamespace.bind(null, state, events));
  events.getNamespaceSuggestions(getNamespaceSuggestions.bind(null, state));
  events.selectItem(function(data) {
    state.selectedItemName.set(data.name);
    events.selectedItemDetails.displayItemDetails(data);
  });
}