var exists = require('../../../lib/exists');
var debug = require('debug')('components:browse:browseNamespace');
var browseService = require('../../../services/browse-service');

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
function browseNamespace(browseState, data) {
  if (exists(data.namespace)) {
    browseState.namespace.set(data.namespace);
  }

  if (exists(data.globQuery)) {
    browseState.globQuery.set(data.globQuery);
  }

  var namespace = browseState.namespace();
  browseService.glob(namespace, browseState.globQuery())
    .then(function globResultsReceived(globResult) {
      browseState.items.set(globResult);
    }, function(err) {
      debug('Failed to glob',
        browseState.namespace(), browseState.globQuery(),
        err, err.stack
      );
      browseState.items.set([]);
    });

  browseService.signature(namespace).then( function(signatureResult) {
      browseState.signature.set(signatureResult);
    }, function(err) {
      debug('Failed to get signature',
        browseState.namespace(),
        err, err.stack
      );
      browseState.signature.set('N/A');
    });
}