var mercury = require('mercury');
var insertCss = require('insert-css');
var AttributeHook = require('../../lib/mercury/attribute-hook');
var Sidebar = require('../sidebar/index');
var MainContent = require('../main-content/index');
var css = require('./index.css');

var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Page level layout of the application
 */
function create() {}

function render(state, events) {
  insertCss(css);
  return h('core-drawer-panel', [
    h('core-header-panel', {
        'drawer': new AttributeHook(true)
      },
      Sidebar.render(state.navigation)
    ),
    h('core-header-panel', {
        'main': new AttributeHook(true)
      },
      MainContent.render(state, events)
    )
  ]);
}