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

function render(state, events) {
  insertCss(css);
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
      mainContent.render(state, events)
    ])
  ]);
}

function renderSideToolbar(state, events) {
  return h('core-toolbar.toolbar', [
    h('h1.title', 'Veyron Browser')
  ]);
}

function renderMainToolbar(state, events) {
  return h('core-toolbar.toolbar', [
    h('paper-icon-button.drawer-toggle', {
      'id': 'drawerToggle',
      'icon': new AttributeHook('menu'),
      'ev-click': mercury.event(events.viewport.openSidebar)
    }),
    h('h2.title', state.viewport.title)
  ]);
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.openSidebar(function() {
    state.sidebarOpened.set(true);
  });
  events.closeSidebar(function() {
    state.sidebarOpened.set(false);
  });
}