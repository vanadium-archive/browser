var mercury = require('mercury');
var onDocumentReady = require('./lib/document-ready');
var viewport = require('./components/viewport/index');
var router = require('./router');
var browse = require('./components/browse/index');
window.debug = require('debug');

onDocumentReady(function startApp() {

  var browseComponent = browse();
  var viewportComponent = viewport();

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
    viewport: viewportComponent.state
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

  // Start the router which will register the application routes
  router(state, events);

  // Render the app
  var render = function(state) {
    return viewport.render(state, events);
  };
  mercury.app(document.body, state, render);

});