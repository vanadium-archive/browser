var mercury = require('mercury');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Help view
 */
function create() {}

function render() {
  // TODO(aghassemi)
  return h('div.empty', 'Help will come one day.');
}