var mercury = require('mercury');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Help view
 */
function create() {}

function render() {
  return h('span', 'HELP! TODO(aghassemi)');
}