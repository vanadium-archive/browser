// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var uuid = require('uuid');
var mercury = require('mercury');
var vanadium = require('vanadium');
var addDelegatedEvents = require('./lib/mercury/add-delegated-events');
var onboarding = require('./onboarding');
var router = require('./router');
var registerItemPlugins = require('./item-plugins/register-plugins');
var debug = require('./components/debug/index');
var browse = require('./components/browse/index');
var error = require('./components/error/index');
var help = require('./components/help/index');
var viewport = require('./components/viewport/index');
var userAccount = require('./components/user-account/index');
var namespaceService = require('./services/namespace/service');
var errorRoute = require('./routes/error');

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
  debug: debugComponent.state
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
  'navigate'
]);
events.browse = browseComponent.events;
events.help = helpComponent.events;
events.viewport = viewportComponent.events;

// Wire Events
wireEvents();

// Start the router which will register the application routes
router(state, events);

// Register the plugins
registerItemPlugins();

// Initialize Vanadium
initVanadium();

// Debugging related exports
exportDebugging();

// Render the app
var render = function(state) {
  return viewport.render(state, events);
};
mercury.app(document.body, state, render);

// Add additional events that mercury's delegator should listenTo.
addDelegatedEvents(['core-overlay-open-completed',
    'down', 'up', 'tap', 'openchange', 'activate', 'delete-item']);

function wireEvents() {
  // TODO(aghassemi): Make these events global.
  // Hook up external browse events.
  events.browse.error(onError);
  events.browse.toast(onToast);

  // Hook up external help events.
  events.help.navigate = events.navigation.navigate;
  events.help.error(onError);
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
 * Initialized vanadium and sets appropriate messages on the splash screen
 */
function initVanadium() {
  viewport.setSplashMessage('Initializing Vanadium...');
  namespaceService.initVanadium().then(function(vruntime) {
    vruntime.once('crash', onVanadiumCrash);
    viewport.setSplashMessage('Initialized');
    state.initialized.set(true);

    // Onboarding Hook for new users after Vanadium is initialized.
    onboarding(vruntime, state);
  }).catch(function(err) {
    if (err instanceof vanadium.verror.ExtensionNotInstalledError) {
      vanadium.extension.promptUserToInstallExtension();
    } else {
      var isError = true;
      viewport.setSplashMessage(err.toString(), isError);
    }
  });
}

/*
 * Handler if Vanadium runtime crashes
 */
function onVanadiumCrash(crashErr) {
  events.browse.error(crashErr);
}

