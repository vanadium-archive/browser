var mercury = require('mercury');
var exists = require('../../lib/exists');
var log = require('../../lib/log')('components:browse:browse-namespace');
var namespaceService = require('../../services/namespace/service');
var smartService = require('../../services/smart-service');

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

  // Search the namespace
  namespaceService.search(namespace, browseState.globQuery()).
  then(function globResultsReceived(items) {
    browseState.put('items', items);
  }).catch(function(err) {
    browseEvents.error(err);
    log.error(err);
  });


  // Update our shortcuts with these predictions.
  smartService.predict('learner-shortcut', '').then(function(predictions) {
    predictions.map(function(prediction) {
      namespaceService.getNamespaceItem(prediction.item).then(function(item) {
        browseState.shortcuts.push(item);
      }).catch(function(err) {
        log.error('Failed to get shortcut:', prediction, err);
      });
    });
  }).catch(function(err) {
    log.error('Could not load shortcuts', err);
  });

  // Trigger display items event
  browseEvents.selectedItemDetails.displayItemDetails({
    name: data.namespace
  });

  // TODO(alexfandrianto): Example toast. Consider removing.
  browseEvents.toast({
    text: 'Browsing ' + data.namespace,
    action: browseNamespace.bind(null, browseState, browseEvents, data),
    actionText: 'REFRESH'
  });

  function emptyOutItems() {
    browseState.put('items', mercury.array([]));
    browseState.put('shortcuts', mercury.array([]));
  }
}
