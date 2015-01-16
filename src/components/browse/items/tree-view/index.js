var mercury = require('mercury');

var h = mercury.h;

module.exports = create;
module.exports.render = render;

function create() {}

function render(itemsState, browseState, browseEvents, navEvents) {
  return h('h2', 'Tree View (TODO)');
}