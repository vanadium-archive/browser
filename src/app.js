// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var uuid = require('uuid');
var mercury = require('mercury');
var addDelegatedEvents = require('./lib/mercury/add-delegated-events');
var onboarding = require('./onboarding');
var router = require('./router');
var registerItemPlugins = require('./item-plugins/register-plugins');
var debug = require('./components/debug');
var browse = require('./components/browse');
var error = require('./components/error');
var help = require('./components/help');
var viewport = require('./components/viewport');
var views = require('./components/browse/views');
var userAccount = require('./components/user-account');
var namespaceService = require('./services/namespace/service');
var stateService = require('./services/state/service');
var errorRoute = require('./routes/error');
var browseRoute = require('./routes/browse');
var log = require('./lib/log')('app');

var browseComponent = browse();
var errorComponent = error();
var debugComponent = debug();
var helpComponent = help();
var viewportComponent = viewport();
var userAccountComponent = userAccount();

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
   * Vanadium Namespace Browsing related state
   */
  browse: browseComponent.state,

  /*
   * Vanadium Namespace Help related state
   */
  help: helpComponent.state,

  /*
   * State of the viewport component
   */
  viewport: viewportComponent.state,

  /*
   * Boolean indicating that app has been initialized.
   * Used to show/hide splash screen.
   * @type {boolean}
   */
  initialized: mercury.value(false),

  /*
   * State of the error component
   */
  error: errorComponent.state,

  /*
   * State for user account component
   */
  userAccount: userAccountComponent.state,

  /*
   * Internal debugging state
   */
  debug: debugComponent.state,

  /*
   * Boolean indicating whether we are in demo mode.
   * In demo mode, a sample-world is created and user is redirected to it as
   * the starting namespace.
   * @type {boolean}
   */
  demo: mercury.value(false),
});

// To level events
var events = mercury.input([
  /*
   * Navigation related events
   */
  'navigation',

  /*
   * Vanadium Namespace Browsing related events
   */
  'browse',

  /*
   * Vanadium Namespace Help related events
   */
  'help',

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
  'navigate',

  /*
   * Event indicating a request to reload the current namespace
   * The current namespace will be passed as data into the handlers.
   */
  'reload'
]);
events.browse = browseComponent.events;
events.help = helpComponent.events;
events.viewport = viewportComponent.events;

// Wire Events
wireEvents();

// Register the plugins
registerItemPlugins();

// Load the user's saved state, followed by other dependencies.
loadUserState().then(function() {
  // Start the router which will register the application routes
  router(state, events);

  // Initialize Vanadium
  initVanadium();
});

// Debugging related exports
exportDebugging();

// Render the app
var render = function(state) {
  return viewport.render(state, events);
};
mercury.app(document.body, state, render);

// Add additional events that mercury's delegator should listenTo.
addDelegatedEvents(['core-overlay-open-completed',
  'down', 'up', 'tap', 'openchange', 'activate', 'delete-item'
]);

function wireEvents() {
  // TODO(aghassemi): Make these events global.
  // Hook up external browse events.
  events.browse.error(onError);
  events.browse.toast(onToast);

  events.navigation.reload(onReload);

  // Hook up external help events.
  events.help.navigate = events.navigation.navigate;
  events.help.error(onError);
}

/*
 * Reload the views for the current namespace
 */
function onReload() {
  var namespace = state.browse.namespace();
  log.debug('reloading', namespace);

  // clear the service cache
  namespaceService.clearCache(namespace);

  // tell views to clear their caches
  views.clearCache(state.browse.views, namespace);

  // navigate to the namespace again
  // TODO(aghassemi) Ideally we only reset the selected item if the old one
  // no longer is in the view, but that's a bit tricky and depends on
  // https://github.com/vanadium/browser/issues/81
  state.browse.selectedItemName.set(namespace);
  events.navigation.navigate({
    path: browseRoute.createUrl(state.browse(), {
      namespace: namespace
    })
  });
}

/*
 * Given an error, navigate to the error page and display that error.
 */
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

/*
 * Given a toast object, let the viewport render it.
 * Toasts are given a unique key to ensure Mercury draws 1 toast per event.
 */
function onToast(toast) {
  toast.key = uuid.v4();
  state.viewport.toasts.push(toast);
}

/*
 * Export some debugging methods at global level
 */
function exportDebugging() {
  window.log = require('./lib/log');
  window.enableContinuousRendering =
    debug.enableContinuousRendering.bind(null, state.debug);
}

/*
 * Load any of the user's application state.
 * Note: This promise will always resolve.
 */
function loadUserState() {
  var loads = [];

  // Set the initial namespace for the user. This guarantees that regardless
  // of starting route, that the user continues where they last left off.
  loads.push(stateService.loadNamespace().then(function(namespace) {
    state.browse.namespace.set(namespace);
  }));

  // Fetch the most recently used side panel width.
  loads.push(stateService.loadSidePanelWidth().then(function(width) {
    state.browse.sidePanelWidth.set(width);
  }));

  // Fetch the most recently used browse view type.
  loads.push(stateService.loadBrowseViewType().then(function(view) {
    state.browse.views.viewType.set(view);
  }));

  return Promise.all(loads).catch(function() {});
}

/*
 * Initialized vanadium and sets appropriate messages on the splash screen
 */
function initVanadium() {
  viewport.setSplashMessage('Initializing Vanadium...');
  namespaceService.getEmailAddress().then(function(email) {
    // Onboarding Hook for new users (async). Currently does not block.
    onboarding(email, state);

    if (state.demo()) {
      return intializeDemo();
    } else {
      return initialized();
    }

    /*
     * Called when Vanadium initialization is complete
     */
    function initialized() {
      viewport.setSplashMessage('Initialized');
      state.initialized.set(true);
    }

    /*
     * Initialized the demo mode
     */
    function intializeDemo() {
      // TODO(alexfandrianto): With JS deprecated, we may want to delete the old
      // demo code. Instead, demo services should be launched by cmdline or Go.
      initialized();
      /*viewport.setSplashMessage('Initializing Sample World Demo...');
      var sampleWorldDirectory = '';
      return sampleWorld.getRootedName().then(function(name) {
        sampleWorldDirectory = name;
        return sampleWorld.create(sampleWorldDirectory);
      }).then(function() {
        initialized();
        // Navigate to the home directory
        events.navigation.navigate({
          path: browseRoute.createUrl(state.browse, {
            namespace: sampleWorldDirectory,
            viewType: 'tree'
          })
        });
      });*/
    }
  }).catch(function(err) {
    var isError = true;
    viewport.setSplashMessage(err.toString(), isError);
    log.error(err);
  });
}
