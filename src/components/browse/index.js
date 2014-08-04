var mercury = require('mercury');
var exists = require('../../lib/exists');
var browseRoute = require('../../routes/browse');
var browseNamespace = require('./event-handlers/browseNamespace');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Browse component provides user interfaces for browsing the Veyron namespace
 */
function create() {

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

    /*
     * Method signature for the namespace, if pointing to a server
     * @type {Object}
     */
    signature: mercury.value(null)

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
    'browseNamespace'
  ]);

  wireUpEvents(state, events);

  return {
    state: state,
    events: events
  };
}

function render(browseState, navigationEvents) {

  // Trigger an actual navigation event when value of the inputs change
  var changeEvent = mercury.valueEvent(function(data) {
    var namespace = browseState.namespace;
    var globQuery = browseState.globQuery;
    if (exists(data.namespace)) {
      namespace = data.namespace;
    }

    if (exists(data.globQuery) && data.globQuery !== '') {
      globQuery = data.globQuery;
    }
    navigationEvents.navigate({
      path: browseRoute.createUrl(namespace, globQuery)
    });
  });

  return [
    h('input', {
      'name': 'namespace',
      'value': browseState.namespace,
      'ev-change': changeEvent
    }),
    h('input', {
      'name': 'globQuery',
      'value': browseState.globQuery,
      'ev-change': changeEvent
    }),
    h('div', ['Current Namespace:', browseState.namespace]),
    h('div', ['Current GlobQuery:', browseState.globQuery]),
    h('ul', renderItems(browseState, navigationEvents)),
    h('h3', 'Method Signature'),
    h('div', JSON.stringify(browseState.signature))
  ];
}

function renderItems(browseState, navigationEvents) {

  return browseState.items.map(function(item) {
    return h('li', [
      h('a', {
        'href': browseRoute.createUrl(item.name, browseState.globQuery),
        'ev-click': mercury.event(navigationEvents.navigate, {
          path: browseRoute.createUrl(item.name, browseState.globQuery)
        })
      }, item.mountedName)
    ]);
  });
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.browseNamespace(browseNamespace.bind(null, state));
}