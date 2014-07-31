var mercury = require('mercury');
var Browse = require('../browse/index');
var Help = require('../help/index');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * MainContent part of the layout
 */
function create() {}

function render(state, events) {
  return [
    h('h1', state.navigation.pageKey),
    h('div', renderContent(state, events))
  ];
}

function renderContent(state, events) {
  var pageKey = state.navigation.pageKey;
  switch (pageKey) {
    case 'browse':
      return Browse.render(state.browse, events.browse);
    case 'help':
      return Help.render();
    default:
      // We shouldn't get here with proper route handlers, so it's an error(bug)
      throw new Error('Could not find page ' + pageKey);
  }
}