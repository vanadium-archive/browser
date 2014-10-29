var mercury = require('mercury');
var insertCss = require('insert-css');
var AttributeHook = require('../../lib/mercury/attribute-hook');
var sidebar = require('../sidebar/index');
var mainContent = require('../main-content/index');
var css = require('./index.css');

var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Page level layout of the application
 */
function create() {

  var state = mercury.struct({
    /*
     * Whether the sidebar drawer is visible
     * @type {boolean}
     */
    sidebarOpened: mercury.value(false),

    /*
     * Title text to display in the toolbar
     * @type {string}
     */
    title: mercury.value(''),

    /*
     * Toast message to display
     * @type {Object}
     */
    toast: mercury.value(null)
  });

  var events = mercury.input([
    'openSidebar',
    'closeSidebar'
  ]);

  wireUpEvents(state, events);

  return {
    state: state,
    events: events
  };
}

/*
 * Draw the full page of the application, which consists of a sidebar and main
 * panel. The sidebar is usually hidden but acts as a selector for the content
 * shown in the main panel. This content is rendered in the full browser window.
 *
 * See @app.js for the state definition. See @sidebar/index.js and
 * @main-content/index.js for their rendering functions.
 */
function render(state, events) {
  insertCss(css);

  if(!state.navigation.pageKey) {
    return mercury.h('div.splash', h('span.screen-reader', 'Loading'));
  }

  var panelAttributes = {
    // Keep the drawer collapsed for any width size
    'responsiveWidth': new AttributeHook('10000px'),
    // If drawer is open, clicking anywhere should close it
    'ev-click': (state.viewport.sidebarOpened ?
      mercury.event(events.viewport.closeSidebar) : null),
    'selected': new AttributeHook(state.viewport.sidebarOpened ?
      'drawer' : 'main')
  };
  return h('core-drawer-panel.panel', panelAttributes, [
    h('core-header-panel.drawer', {
      'drawer': new AttributeHook(true)
    }, [
      renderSideToolbar(state, events),
      sidebar.render(state, events)
    ]),
    h('core-header-panel.main', {
      'main': new AttributeHook(true)
    }, [
      renderMainToolbar(state, events),
      mainContent.render(state, events),
      renderToast(state)
    ])
  ]);
}

/*
 * The title of the sidebar.
 */
function renderSideToolbar(state, events) {
  return h('core-toolbar.toolbar', [
    h('h1.title', 'Namespace Browser')
  ]);
}

/*
 * The title of the main content.
 */
function renderMainToolbar(state, events) {
  return h('core-toolbar.toolbar', [
    h('paper-icon-button.drawer-toggle', {
      'id': 'drawerToggle',
      'icon': new AttributeHook('menu'),
      'ev-click': mercury.event(events.viewport.openSidebar)
    }),
    h('h2.title', state.viewport.title),
    mainContent.renderHeader(state,events)
  ]);
}

/*
 * Draws a short duration toast to inform the user.
 */
var toastDuration = 3000; // ms
function renderToast(state) {
  if (!state.viewport.toast) {
    return [];
  }
  // The toast type affects the css class
  var cssClass = state.viewport.toast.type || 'info';

  // If there is an event attached to the toast, draw it here.
  var children = [];
  if (state.viewport.toast.actionText) {
    children.push(h('div', {
      'ev-click': state.viewport.toast.action
    }, state.viewport.toast.actionText));
  }

  return h('paper-toast.' + cssClass, {
    key: state.viewport.toast.key, // unique per toast => only drawn once
    text: new AttributeHook(state.viewport.toast.text),
    opened: new AttributeHook(true),
    duration: new AttributeHook(toastDuration)
  }, children);
}

/*
 * Wire up events that we know how to handle.
 */
function wireUpEvents(state, events) {
  events.openSidebar(function() {
    state.sidebarOpened.set(true);
  });
  events.closeSidebar(function() {
    state.sidebarOpened.set(false);
  });
}