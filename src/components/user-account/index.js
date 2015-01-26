var mercury = require('mercury');
var insertCss = require('insert-css');

var namespaceService = require('../../services/namespace/service');

var css = require('./index.css');

var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * User Account
 */
function create() {

  var state = mercury.struct({
    /*
     * User's account name
     * @type {string}
     */
    accountName: mercury.value('')
  });

  namespaceService.getAccountName().then(function(accountName) {
    state.accountName.set(accountName);
  });

  return {
    state: state
  };
}

function render(state) {
  insertCss(css);

  return h('core-tooltip.account-name', {
      attributes: {
        'label': 'You are logged in as:',
        'position': 'bottom'
      }
    },
    h('span', state.accountName)
  );
}