// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var insertCss = require('insert-css');

var PropertyValueEvent = require('../../lib/mercury/property-value-event');

var exists = require('../../lib/exists');
var store = require('../../lib/store');

var namespaceService = require('../../services/namespace/service');
var smartService = require('../../services/smart/service');

var browseRoute = require('../../routes/browse');
var bookmarksRoute = require('../../routes/bookmarks');
var recommendationsRoute = require('../../routes/recommendations');

var ItemDetails = require('./item-details/index');
var Views = require('./views/index');
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
 * Browse component provides user interfaces for browsing the Vanadium namespace
 */
function create() {
  loadLearners();

  var selectedItemDetails = new ItemDetails();
  var bookmarks = new Bookmarks();
  var recommendations = new Recommendations();
  var views = new Views();

  var state = mercury.varhash({
    /*
     * Vanadium namespace being displayed and queried
     * @type {string}
     */
    namespace: mercury.value(''),

    /*
     * Glob query applied to the Vanadium namespace
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
     * State of the views component
     */
    views: views.state,

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
    subPage: mercury.value('views'),

    /*
     * Whether the side panel is collapsed or expanded
     * @type {Boolean}
     */
    sidePanelCollapsed: mercury.value(false),

    /*
     * Width of the side panel
     * @type {String}
     */
    sidePanelWidth: mercury.value('50%')

  });

  // get sidePanelWidth from persistent storage
  store.getValue('sidePanelWidth').then(function(val) {
    if (val) {
      state.sidePanelWidth.set(val);
    }
  });

  var events = mercury.input([
    /*
     * Indicates a request to browse the Vanadium namespace
     * Data of form:
     * {
     *   namespace: '/namespace-root:8881/name/space',
     *   globQuery: '*',
     * }
     * is expected as data for the event
     */
    'browseNamespace',

    /*
     * View components events.
     */
    'views',

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
    'toast',

    /*
     * Event for toggling the expand/collapse state of the sidebar details panel
     */
    'toggleSidePanel',

    /*
     * Drag to resize the side details panel
     */
    'slideSidePanel'
  ]);

  wireUpEvents(state, events);
  events.selectedItemDetails = selectedItemDetails.events;
  events.views = views.events;
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
 * Renders the top bar, where the user can specify a namespace root.
 */
function renderHeader(browseState, browseEvents, navEvents) {
  return h('div.header-content', [
    renderNamespaceBox(browseState, browseEvents, navEvents)
  ]);
}

function renderSidePanelToggle(browseState, browseEvents) {
  var cssClass = '.core-header.side-panel-toggle';
  if (browseState.sidePanelCollapsed) {
    cssClass += '.collapsed';
  }
  return h('paper-fab' + cssClass, {
    attributes: {
      'mini': true,
      'title': browseState.sidePanelCollapsed ?
        'Show side panel' : 'Hide side panel',
      'icon': browseState.sidePanelCollapsed ?
        'chevron-left' : 'chevron-right',
    },
    'ev-click': mercury.event(browseEvents.toggleSidePanel, {
      collapsed: !browseState.sidePanelCollapsed
    })
  });
}

/*
 * Renders the main body.
 * A toolbar is rendered on top of the mainView and sideView showing the current
 * position in the namespace as well as a globquery searchbox.
 * The mainView contains the shortcuts and names at this point in the namespace.
 * The sideView displays the detail information of the selected name.
 */
function render(browseState, browseEvents, navEvents) {
  insertCss(css);

  var expandCollapse = renderSidePanelToggle(browseState, browseEvents);

  var sideView = [
    expandCollapse,
    ItemDetails.render(
      browseState.selectedItemDetails,
      browseEvents.selectedItemDetails,
      browseState,
      navEvents
    )
  ];

  var mainView;
  switch (browseState.subPage) {
    case 'views':
      mainView = Views.render(browseState.views, browseEvents.views,
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

  var view = [
    h('core-toolbar.browse-toolbar.core-narrow', [
      renderToolbar(browseState, navEvents)
    ]),
    h('core-drawer-panel', {
      attributes: {
        'id': 'sidebarDrawer',
        'rightDrawer': true,
        'drawerWidth': browseState.sidePanelCollapsed ?
          '0%' : browseState.sidePanelWidth,
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
        h('div.resize-handle', {
          'ev-mousedown': function(e) {
            browseEvents.slideSidePanel({ rawEvent: e,
                collapsed: browseState.sidePanelCollapsed });
          }
        }),
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
    h('div', {
      attributes: {
        'layout': 'true',
        'horizontal': 'true'
      }
    }, [
      h('core-tooltip.icontooltip', {
          attributes: {
            'label': 'Reload'
          },
          'position': 'bottom'
        },
        h('paper-icon-button.icon', {
          attributes: {
            'icon': 'refresh',
            'label': 'Reload'
          },
          'ev-click': function() {
            location.reload();
          }
        })
      ),
      h('core-tooltip.nstooltip', {
          attributes: {
            'label': 'Enter a name to browse, e.g. house/living-room'
          },
          'position': 'bottom'
        },
        h('paper-autocomplete.autocomplete', {
          attributes: {
            'name': 'namespace',
            'value': browseState.namespace,
            'delimiter': '/',
            'flex': 'true',
            'spellcheck': 'false',
            'maxItems': NAMESPACE_AUTOCOMPLETE_MAX_ITEMS
          },
          'ev-focus': focusEvent,
          'ev-input': inputEvent,
          'ev-change': changeEvent
        }, children)
      )
    ])
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
function renderToolbar(browseState, navEvents) {

  var selectedActionKey = browseState.subPage;
  if (browseState.subPage === 'views') {
    selectedActionKey = browseState.views.viewType;
  }

  var switchGroup = h('div.icon-group', [
    createActionIcon('Tree view', 'list',
      browseRoute.createUrl(browseState, {
        viewType: 'tree'
      }), selectedActionKey === 'tree'
    ),
    createActionIcon('Radial view', 'image:filter-tilt-shift',
      browseRoute.createUrl(browseState, {
        viewType: 'visualize'
      }), selectedActionKey === 'visualize'
    ),
    createActionIcon('Grid view', 'apps',
      browseRoute.createUrl(browseState, {
        viewType: 'grid'
      }), selectedActionKey === 'grid'
    )
  ]);
  var breadcrumbs = renderBreadcrumbs(browseState, navEvents);
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

  var view = h('div.browse-toolbar-layout', {
    attributes: {
      'layout': 'true',
      'horizontal': 'true'
    }
  }, [
    switchGroup,
    ruler,
    breadcrumbs,
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
            'spellcheck': 'false',
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
 * Starts at the top of the name and goes all the way to the selected item.
 * Each name part is a link to a parent.
 */
function renderBreadcrumbs(browseState, navEvents) {

  var name = browseState.selectedItemName || browseState.namespace;
  var isRooted = namespaceService.util.isRooted(name);
  var namespaceParts = namespaceService.util.parseName(name);
  var parentParts = namespaceService.util.parseName(browseState.namespace);
  var breadCrumbs = [];
  if (!isRooted) {
    // Add a relative root (empty namespace)
    var rootUrl = browseRoute.createUrl(browseState, {
      namespace: ''
    });
    breadCrumbs.push(h('li.breadcrumb-item.relative-name' +
      (parentParts.length ? '.breadcrumb-item-prefix' : ''), [
      //TODO(aghassemi) refactor link generation code
      h('a', {
        'href': rootUrl,
        'ev-click': mercury.event(navEvents.navigate, {
          path: rootUrl
        })
      }, '<Home>')
    ]));
  }

  parentParts.pop();  // remove last part (current view root)

  for (var i = 0; i < namespaceParts.length; i++) {
    var namePart = namespaceParts[i].trim();
    var fullName = (isRooted ? '/' : '') +
      namespaceService.util.join(namespaceParts.slice(0, i + 1));

    var url = browseRoute.createUrl(browseState, {
      namespace: fullName
    });

    var isPartOfParent = parentParts.indexOf(namePart) > -1;
    var cssClass = 'breadcrumb-item';
    if (isPartOfParent) {
      cssClass += '.breadcrumb-item-prefix';
    }
    var listItem = h('li.' + cssClass, [
      h('a', {
        'href': url,
        'ev-click': mercury.event(navEvents.navigate, {
          path: url
        })
      }, namePart)
    ]);

    breadCrumbs.push(listItem);
  }

  var bc = h('ul.breadcrumbs', breadCrumbs);

  return h('div.breadcrumbs-wrapper', bc);
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.browseNamespace(browseNamespace.bind(null, state, events));
  events.getNamespaceSuggestions(getNamespaceSuggestions.bind(null, state));
  events.selectItem(function(data) {
    state.selectedItemName.set(data.name);
    events.selectedItemDetails.displayItemDetails(data);
  });

  events.toggleSidePanel(function(data) { // hide side panel
    state.sidePanelCollapsed.set(data.collapsed);
    var drawer = document.querySelector('#sidebarDrawer');
    if (!drawer) {
      return;
    }
    //Fire a window resize event when animation ends so components can adjust
    //based on the new view port size
    // TODO(aghassemi): specific to webkit
    drawer.addEventListener('webkitTransitionEnd', fireResizeEvent);
  });

  events.slideSidePanel(function(data) { // resize side panel
    // ignore if not primary button, or if side panel is collapsed
    if (data.rawEvent.button !== 0 || data.collapsed) {
      return;
    }
    var dragX = data.rawEvent.clientX; // initial position of drag target
    var drawer = document.querySelector('#sidebarDrawer');
    var oldP = +drawer.getAttribute('drawerWidth').replace('%', '');
    var oldW = drawer.offsetWidth; // width of both panels in pixels
    drawer.querySelector('::shadow core-selector').
    classList.remove('transition');
    window.addEventListener('mousemove', slideMove);
    window.addEventListener('mouseup', slideEnd);

    function slideMove(e) { // move
      var dx = e.clientX - dragX;
      var newP = Math.min(Math.max(oldP - (dx * 100 / oldW), 10), 90);
      drawer.setAttribute('drawerWidth', newP.toFixed(2) + '%');
      e.preventDefault(); // avoid selecting text
    }

    function slideEnd(e) { // release
      window.removeEventListener('mouseup', slideEnd);
      window.removeEventListener('mousemove', slideMove);
      drawer.querySelector('::shadow core-selector').
      classList.add('transition');
      var drawerWidth = drawer.getAttribute('drawerWidth');
      store.setValue('sidePanelWidth', drawerWidth
      ).catch(function(err) {
        log.error(err);
      });
      state.sidePanelWidth.set(drawerWidth);
      state.sidePanelCollapsed.set(false);
      fireResizeEvent(null);
    } // end slideEnd
  }); // end events.slideSidePanel

  function fireResizeEvent(e) { // resize on end animation
    var evt = document.createEvent('UIEvents');
    evt.initUIEvent('resize', true, false, window, 0);
    window.dispatchEvent(evt);
    if (e !== null) { // not if called by slideEnd
      // TODO(aghassemi): specific to webkit
      document.querySelector('#sidebarDrawer').
      removeEventListener('webkitTransitionEnd', fireResizeEvent);
    }
  }

}
