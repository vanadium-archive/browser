var mercury = require('mercury');
var insertCss = require('insert-css');
var Browse = require('../browse/index');
var Help = require('../help/index');
var css = require('./index.css');

var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * MainContent part of the layout
 */
function create() {}

function render(state, events) {
  insertCss(css);
  return [
    h('div.main-container', renderContent(state, events))
  ];
}

function renderContent(state, events) {
  var pageKey = state.navigation.pageKey;
  switch (pageKey) {
    case 'browse':
      return Browse.render(state.browse, events.navigation);
    case 'help':
      return Help.render();
    default:
      // We shouldn't get here with proper route handlers, so it's an error(bug)
      throw new Error('Could not find page ' + pageKey);
  }
}