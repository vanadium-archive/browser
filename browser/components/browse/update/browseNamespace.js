var exists = require('../../../lib/exists');

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
  if (exists(data.namespace) && data.namespace !== '') {
    browseState.namespace.set(data.namespace);
  }

  if (exists(data.globQuery) && data.globQuery !== '') {
    browseState.globQuery.set(data.globQuery);
  }
}