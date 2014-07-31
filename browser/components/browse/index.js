var mercury = require('mercury');
var browseNamespace = require('./update/browseNamespace');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Browse component provides user interfaces for browsing the Veyron namespace
 */
function create() {

  var state = mercury.struct({
    /*
     * Current Veyron namespace being displayed and queried
     * @type {string}
     */
    namespace: mercury.value(null),

    /*
     * Current Glob query applied to the Veyron namespace
     * @type {string}
     */
    globQuery: mercury.value(null)
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

function render(browseState, browseEvents) {

  // Trigger browseNamespace event when value of the inputs change
  var changeEvent = mercury.valueEvent(browseEvents.browseNamespace);

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
    h('div', ['Current GlobQuery:', browseState.globQuery])
  ];
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.browseNamespace(browseNamespace.bind(null, state));
}