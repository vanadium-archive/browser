var mercury = require('mercury');
var insertCss = require('insert-css');
var AttributeHook = require('../../lib/mercury/attribute-hook');
var PaperInputValueEvent = require('../../lib/mercury/paper-input-value-event');
var exists = require('../../lib/exists');
var browseRoute = require('../../routes/browse');
var browseNamespace = require('./browse-namespace');
var itemDetailsComponent = require('./item-details/index');
var browseService = require('../../services/browse-service');
var css = require('./index.css');

var h = mercury.h;

module.exports = create;
module.exports.render = render;
module.exports.renderHeader = renderHeader;

/*
 * Browse component provides user interfaces for browsing the Veyron namespace
 */
function create() {

  var selectedItemDetails = itemDetailsComponent();

  var state = mercury.struct({
    /*
     * Veyron namespace being displayed and queried
     * @type {string}
     */
    namespace: mercury.value(''), //TODO(aghassemi) temp

    /*
     * Glob query applied to the Veyron namespace
     * @type {string}
     */
    globQuery: mercury.value('*'),

    /*
     * List of children for the namespace
     * @type {Array<Object>}
     */
    items: mercury.array([]),

    selectedItemDetails: selectedItemDetails.state

  });

  var events = mercury.input([
    /*
     * Indicates a request to browse the Veyron namespace
     * Data of form:
     * {
     *   namespace: '/veyron/name/space',
     *   globQuery: '*',
     * }
     * is expected as data for the event
     */
    'browseNamespace',

    'selectedItemDetails',

    'error'
  ]);

  wireUpEvents(state, events);
  events.selectedItemDetails = selectedItemDetails.events;

  return {
    state: state,
    events: events
  };
}

function renderHeader(browseState, browseEvents, navigationEvents) {
  // Trigger an actual navigation event when value of the inputs change
  var changeEvent = new PaperInputValueEvent(function(val) {
    var namespace = browseState.namespace;
    if (exists(val)) {
      namespace = val
    }
    navigationEvents.navigate({
      path: browseRoute.createUrl(namespace, browseState.globQuery)
    });
  });

  return h('div.namespace-box', [
    h('core-tooltip.tooltip', {
      'label': new AttributeHook('Enter a name to browse, e.g. house/living-room'),
      'position': 'right',
    }, [

      h('core-icon.icon', {
        'icon': new AttributeHook('explore')
      }),
      h('paper-input', {
        'name': 'namespace',
        'value': browseState.namespace,
        'ev-change': changeEvent
      })
    ])
  ]);
}

function render(browseState, browseEvents, navigationEvents) {
  insertCss(css);
  var drawerWidth = '350px';

  var sideView = [
    itemDetailsComponent.render(
      browseState.selectedItemDetails,
      browseEvents.selectedItemDetails
    )
  ];

  var mainView = [
    h('div.items-container', renderItems())
  ];

  var sideViewWidth = '50%';
  if (browseState.items.length === 0) {
    mainView = h('div.empty', 'No children to display.')
  }

  var view = [
    h('core-toolbar.browse-toolbar', [renderBreadcrumbs(), renderSearch()]),
    h('core-drawer-panel', {
      'rightDrawer': new AttributeHook(true),
      'drawerWidth': new AttributeHook(sideViewWidth),
      'responsiveWidth': new AttributeHook('0px')
    }, [
      h('core-header-panel.browse-main-panel', {
        'main': new AttributeHook(true)
      }, [
        mainView
      ]),
      h('core-header-panel.browse-details-sidebar', {
        'drawer': new AttributeHook(true)
      }, [
        sideView
      ])
    ])
  ];

  return h('core-drawer-panel', {
    'drawerWidth': new AttributeHook('0px'),
  }, [
    h('core-header-panel', {
      'main': new AttributeHook(true)
    }, [
      view
    ]),
  ]);

  function renderSearch() {
    // Trigger an actual navigation event when value of the inputs change
    var changeEvent = new PaperInputValueEvent(function(val) {
      var globQuery = browseState.globQuery;
      if (exists(val)) {
        globQuery = val;
      }
      navigationEvents.navigate({
        path: browseRoute.createUrl(browseState.namespace, globQuery)
      });
    });

    return h('div.search-box', [
      h('core-tooltip.tooltip', {
        'label': new AttributeHook('Enter Glob query for searching, e.g. */*/a*'),
        'position': 'left',
      }, [
        h('core-icon.icon', {
          'icon': new AttributeHook('search')
        }),
        h('paper-input.input', {
          'name': 'globQuery',
          'value': browseState.globQuery,
          'ev-change': changeEvent
        })
      ])
    ]);
  }

  function renderItems() {
    return browseState.items.map(function(item) {
      var selected = browseState.selectedItemDetails.itemName === item.itemName;

      var expandAction = null;
      if (item.isGlobbable) {
        expandAction = h('a.drill', {
          'href': browseRoute.createUrl(item.itemName, browseState.globQuery),
          'ev-click': mercury.event(navigationEvents.navigate, {
            path: browseRoute.createUrl(item.itemName, browseState.globQuery)
          })
        }, h('core-icon.icon', {
          'icon': new AttributeHook('chevron-right')
        }));
      }
      return h('div.item.card' + (selected ? '.selected' : ''), [
        h('a.label', {
          'href': 'javascript://',
          'ev-click': mercury.event(
            browseEvents.selectedItemDetails.displayItemDetails, {
              name: item.itemName
            })
        }, item.mountedName),
        expandAction
      ]);
    });
  }

  function renderBreadcrumbs() {

    var isRooted = browseService.isRooted(browseState.namespace);
    var namespaceParts = browseState.namespace.split('/').filter(
      function(n) {
        return n.trim() !== ''
      }
    );
    var breadCrumbs = [];
    if (!isRooted) {
      breadCrumbs.push(h('li.breadcrumb-item', [
        //TODO(aghassemi) refactor link generation code
        h('a', {
          'href': browseRoute.createUrl(),
          'ev-click': mercury.event(navigationEvents.navigate, {
            path: browseRoute.createUrl()
          })
        }, 'Home')
      ]))
    }

    for (var i = 0; i < namespaceParts.length; i++) {
      var namePart = namespaceParts[i].trim();
      var fullName = (isRooted ? '/' : '') +
        browseService.join(namespaceParts.slice(0, i + 1));

      var listItem = h('li.breadcrumb-item', [
        h('a', {
          'href': browseRoute.createUrl(fullName),
          'ev-click': mercury.event(navigationEvents.navigate, {
            path: browseRoute.createUrl(fullName)
          })
        }, namePart)
      ]);

      breadCrumbs.push(listItem);
    }

    return h('ul.breadcrumbs', breadCrumbs);
  }
}
// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.browseNamespace(browseNamespace.bind(null, state, events));
}