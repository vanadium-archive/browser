var mercury = require('mercury');
var onDocumentReady = require('./lib/document-ready');
var viewport = require('./components/viewport/index');
var router = require('./router');
var browse = require('./components/browse/index');
var error = require('./components/error/index');
var errorRoute = require('./routes/error');

window.debug = require('debug');

onDocumentReady(function startApp() {

  var browseComponent = browse();
  var viewportComponent = viewport();
  var errorComponent = error();

  // Top level state
  var state = mercury.struct({
    /*
     * Navigation related states
     */
    navigation: mercury.struct({
      /*
       * Identifier for the currently displayed page.
       * Mutable via route handlers
       * @type {string}
       */
      pageKey: mercury.value('')
    }),
    /*
     * Veyron Namespace Browsing related states
     */
    browse: browseComponent.state,

    /*
     * State of the viewport component
     */
    viewport: viewportComponent.state,

    /*
     * State of the error component
     */
    error: errorComponent.state
  });

  // To level events
  var events = mercury.input([
    /*
     * Navigation related events
     */
    'navigation',

    /*
     * Veyron Namespace Browsing related events
     */
    'browse',

    /*
     * Events of the viewport component
     */
    'viewport'
  ]);
  events.navigation = mercury.input([
    /*
     * Indicates a navigation request to a resource
     * Data of form:
     * {
     *   path: 'path/to/resource'
     * }
     * is expected as data for the event
     */
    'navigate'
  ]);
  events.browse = browseComponent.events;
  events.viewport = viewportComponent.events;

  // Wire Events
  wireEvents();

  // Start the router which will register the application routes
  router(state, events);

  // Render the app
  var render = function(state) {
    return viewport.render(state, events);
  };
  mercury.app(document.body, state, render);

  function wireEvents() {
    events.browse.error(onError);
  }

  function onError(err) {
    var msg = err.toString();
    if (err.message) {
      msg = err.message;
    }
    state.error.message.set(msg);
    events.navigation.navigate({
      path: errorRoute.createUrl(),
      skipHistoryPush: true
    });
  }

});