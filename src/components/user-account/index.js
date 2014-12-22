var mercury = require('mercury');
var namespaceService = require('../../services/namespace/service');

module.exports = create;

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
