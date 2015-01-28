var mercury = require('mercury');
var uuid = require('uuid');

var GridView = require('./grid-view/index');
var TreeView = require('./tree-view/index');
var VisualizeView = require('./visualize-view/index');

var namespaceService = require('../../../services/namespace/service');

var log = require('../../../lib/log')('components:browse:items');

module.exports = create;
module.exports.render = render;
module.exports.load = load;
module.exports.trySetViewType = trySetViewType;

var VALID_VIEW_TYPES = ['grid', 'tree', 'visualize'];

/*
 * Items view.
 * Renders one of: Grid, Tree or Visualize views depending on the state
 */
function create() {

  var treeComponent = new TreeView();

  var state = mercury.varhash({

    tree: treeComponent.state,

    /*
     * List of namespace items to display
     * @see services/namespace/item
     * @type {Array<namespaceitem>}
     */
    items: mercury.array([]),

    /*
     * Specifies the current view type of the items.
     * One of: grid, tree, visualize
     */
    viewType: mercury.value('grid'),

    /*
     * uuid for the current browse-namespace request.
     * Needed to handle out-of-order return of async calls.
     * @type {String}
     */
    currentRequestId: mercury.value('')
  });

  var events = mercury.input([
    'tree'
  ]);

  events.tree = treeComponent.events;

  return {
    state: state,
    events: events
  };
}

function trySetViewType(state, viewType) {
  var isValid = VALID_VIEW_TYPES.indexOf(viewType) >= 0;
  if (!isValid) {
    return false;
  }

  state.viewType.set(viewType);
  return true;
}

/*
 * Does the initialization and loading of the data necessary to display the
 * namespace items.
 * Called and used by the parent browse view to initialize the view on
 * request.
 * Returns a promise that will be resolved when loading is finished. Promise
 * is used by the parent browse view to display a loading progressbar.
 */
function load(state, namespace, globQuery) {

  // TODO(aghassemi)
  // -Rename the concept to "init", not every component may have it.
  // does not return anything, we can have showLoadingIndicator(bool) be an
  // functionality that can be requested of the browse view.
  // -Move items to "GridView"
  // -Have a common component between tree and vis to share the childrens map

  if (state.viewType() === 'tree') {
    namespaceService.getNamespaceItem(namespace).then(function(item) {
        state.tree.put('rootItem', item); // WooHoo! fixed the bug!
    });
    return TreeView.expand(state.tree, namespace);
  }

  if (state.viewType() !== 'grid') {
    return Promise.resolve();
  }

  // Search the namespace and update the browseState's items.
  var requestId = uuid.v4();
  state.currentRequestId.set(requestId);
  state.put('items', mercury.array([]));

  return new Promise(function(resolve, reject) {
    namespaceService.search(namespace, globQuery).
    then(function globResultsReceived(items) {
      if (!isCurrentRequest()) {
        resolve();
        return;
      }
      state.put('items', items);
      items.events.on('end', loadingFinished);
      items.events.on('streamError', loadingFinished);
    }).catch(function(err) {
      log.error(err);
      reject();
    });

    function loadingFinished() {
      if (!isCurrentRequest()) {
        return;
      }
      resolve();
    }
  });

  // Whether we are still the current request. This is used to ignore out of
  // order return of async calls where user has moved on to another item
  // by the time previous requests result comes back.
  function isCurrentRequest() {
    return state.currentRequestId() === requestId;
  }
}

function render(state, events, browseState, browseEvents, navEvents) {
  switch (state.viewType) {
    case 'grid':
      return GridView.render(state, browseState, browseEvents, navEvents);
    case 'tree':
      return TreeView.render(state.tree, events.tree,
          browseState, browseEvents);
    case 'visualize':
      return VisualizeView.render(state, browseState, browseEvents, navEvents);
    default:
      log.error('Unsupported viewType: ' + state.viewType);
  }
}
