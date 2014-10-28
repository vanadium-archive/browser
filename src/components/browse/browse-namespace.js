var mercury = require('mercury');
var handleShortcuts = require('./handle-shortcuts');
var recommendShortcuts = require('./recommend-shortcuts');
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

  var namespace = browseState.namespace();

  // Search the namespace and update the browseState's items.
  browseState.put('items', mercury.array([]));
  namespaceService.search(namespace, browseState.globQuery()).
  then(function globResultsReceived(items) {
    browseState.put('items', items);
  }).catch(function(err) {
    browseEvents.error(err);
    log.error(err);
  });

  // Reload the user's shortcuts.
  handleShortcuts.load(browseState).catch(function(err) {
    // TODO(alexfandrianto): I'd like to toast here, but our toasting mechanism
    // would only allow for 1 toast. The toast below would override this one.
    // Perhaps we should allow an array of toasts to be set?
    log.error('Could not load user shortcuts', err);
  });

  // Update our shortcuts, as they may have changed.
  recommendShortcuts(browseState);

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
}
