var browseService = require('../../../services/browse-service');
var debug = require('debug')('display-item-details');

module.exports = displayItemDetails;

function displayItemDetails(state, data) {
  var name = data.name;
  state.itemName.set(name);

  browseService.signature(name).then(function(signatureResult) {
    state.signature.set(signatureResult);
  }, function(err) {
    debug('Failed to get signature',
      name,
      err, (err && err.stack) ? err.stack : undefined
    );
    state.signature.set('');
  });
}