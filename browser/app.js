var mercury = require('mercury');
var onDocumentReady = require('./lib/document-ready');
var Viewport = require('./components/viewport/index');
var router = require('./router');
var browse = require('./components/browse/index');

onDocumentReady(function startApp() {

  var browseComponent = browse();

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
      pageKey: mercury.value(null)
    }),
    /*
     * Veyron Namespace Browsing related states
     */
    browse: browseComponent.state
  });

  // To level events
  var events = mercury.input([
    /*
     * Navigation related events
     */
    'navigation',

    /*
     * Veyron Namespace Browsing related events
     * Source: components/browse/events
     */
    'browse'
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

  // Start the router which will register the application routes
  router(state, events);

  // Render the app
  var render = function(state) {
    return Viewport.render(state, events);
  };
  mercury.app(document.body, state, render);

});