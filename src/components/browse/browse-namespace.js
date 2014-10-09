var exists = require('../../lib/exists');
var log = require('../../lib/log')('components:browse:browse-namespace');
var namespaceService = require('../../services/namespace/service');

module.exports = browseNamespace;

/*
 * Default event handler for the browseNamespace event.
 * Updates the necessary states when browseNamespace is triggered
 * Data is of the form
 * {
 *   namespace: '/veyron/name/space',
 *   globQuery: '*',
 * }
 */
function browseNamespace(browseState, browseEvents, data) {
  if (exists(data.namespace)) {
    browseState.namespace.set(data.namespace);
  }

  if (exists(data.globQuery)) {
    if (data.globQuery === '') {
      data.globQuery = '*';
    }
    browseState.globQuery.set(data.globQuery);
  }

  emptyOutItems();

  var namespace = browseState.namespace();
  namespaceService.glob(namespace, browseState.globQuery()).
  then(function globResultsReceived(items) {
    browseState.put('items', items);
  }).catch(function(err) {
    browseEvents.error(err);
    log.error(err);
  });

  // trigger display items event
  browseEvents.selectedItemDetails.displayItemDetails({
    name: data.namespace
  });

  function emptyOutItems() {
    browseState.put('items', []);
  }
}
