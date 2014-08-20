var mercury = require('mercury');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Help view
 */
function create() {

  var state = mercury.struct({
    /*
     * Detailed description of error
     * @type {string}
     */
    message: mercury.value(''),
  });

  return {
    state: state
  };
}

function render(state) {
  // TODO(aghassemi)
  return [
    h('p', state.message)
  ];
}