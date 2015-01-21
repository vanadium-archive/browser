var mercury = require('mercury');
var insertCss = require('insert-css');

var Sidebar = require('../sidebar/index');
var MainContent = require('../main-content/index');
var ReportBug = require('../bug-report/index');

var css = require('./index.css');

var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Page level layout of the application
 */
function create() {

  var state = mercury.varhash({
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
     * Toast messages to display
     * @type {Array<Object>}
     */
    toasts: mercury.array([])
  });

  var events = mercury.input([
    'openSidebar',
    'closeSidebar',
    'deferRemoveToast',
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
    return mercury.h('paper-spinner', {
      attributes: {
        'active': true,
        'aria-label': 'Loading'
      }
    });
  }

  var panelAttributes = {
    attributes: {
      // Keep the drawer collapsed for any width size
      'responsiveWidth': '10000px',
      'selected': state.viewport.sidebarOpened ? 'drawer' : 'main'
    },
    // If drawer is open, clicking anywhere should close it
    'ev-click': (state.viewport.sidebarOpened ?
      mercury.event(events.viewport.closeSidebar) : null),
  };
  return h('core-drawer-panel.panel', panelAttributes, [
    h('core-header-panel.drawer', {
      attributes: {
        'drawer': true
      }
    }, [
      renderSideToolbar(state, events),
      Sidebar.render(state, events)
    ]),
    h('core-header-panel.main', {
      attributes: {
        'main': true
      }
    }, [
      renderMainToolbar(state, events),
      MainContent.render(state, events),
      renderToasts(state, events),
      ReportBug.render()
    ])
  ]);
}

/*
 * The title of the sidebar.
 */
function renderSideToolbar(state, events) {
  return h('core-toolbar.toolbar', [
    h('h1.title', 'Viz Vanadium Viewer')
  ]);
}

/*
 * The title of the main content.
 */
function renderMainToolbar(state, events) {
  return h('core-toolbar.toolbar', [
    h('paper-icon-button.drawer-toggle', {
      attributes: {
        'icon': 'menu'
      },
      'id': 'drawerToggle',
      'ev-click': mercury.event(events.viewport.openSidebar)
    }),
    h('h2.title', state.viewport.title),
    MainContent.renderHeader(state,events),
    h('core-tooltip.account-name', {
      attributes: {
        'label': 'You are logged in as:',
        'position': 'left'
      }
    },
      h('span', state.userAccount.accountName)
    )
  ]);
}

/*
 * Draws all the toasts stored in the state. Old toasts remain hidden.
 *
 * TODO(alexfandrianto): In order to limit mercury state, we attempt to purge
 * state.viewport.toasts. core-overlay-close-completed isn't always fired if
 * too many occur in the same time range, so setTimeout upon core-overlay-open-
 * completed works to solve that.
 * TODO(alexfandrianto): Try to get autoCloseDisabled accepted by Polymer so
 * that the paper-toast behavior is more consistent.
 */
function renderToasts(state, events) {
  return h('div.toasts', state.viewport.toasts.map(function(toast) {
    return renderToast(toast, events);
  }));
}

/*
 * Draws a short duration toast to inform the user.
 */
var toastDuration = 3000; // ms
function renderToast(toast, events) {
  // The toast type affects the css class
  var cssClass = toast.type || 'info';

  // If there is an event attached to the toast, draw it here.
  var children = [];
  if (toast.actionText) {
    children.push(h('div', {
      'ev-click': toast.action
    }, toast.actionText));
  }

  return h('paper-toast.' + cssClass, {
    'key': toast.key, // unique per toast => only drawn once
    attributes: {
      'text': toast.text,
      'opened': true,
      'duration': toastDuration,
      'autoCloseDisabled': true
    },
    // Clean up the old toasts after enough time has passed.
    'ev-core-overlay-open-completed': mercury.event(
      events.viewport.deferRemoveToast,
      toast.key
    )
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
  events.deferRemoveToast(function(key) {
    // Remove the toast after a reasonable delay.
    setTimeout(function() {
      // Filter out the toast whose key matches.
      state.put('toasts', state.toasts.filter(function(toast) {
        return !toast.key.equals(key);
      }));
    }, toastDuration);
  });
}
