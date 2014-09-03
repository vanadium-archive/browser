var mercury = require('mercury');
var exists = require('../../lib/exists');
var debug = require('debug')('components:browse:browse-namespace');
var browseService = require('../../services/browse-service');

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
  browseService.isGlobbable(namespace).then(function(isGlobbable) {
    if(!isGlobbable) {
      debug('Not Globbable:', namespace);
      emptyOutItems();
      return;
    }
    return browseService.glob(namespace, browseState.globQuery())
    .then(function globResultsReceived(globResult) {
      debug('Name and Glob result', namespace, globResult);
      emptyOutItems();
      globResult.map(constructItemStruct).forEach(function(i) {
        browseState.items.push(i);
      });
    });
  }).catch(function(err) {
    emptyOutItems();
    browseEvents.error(err);
    debug('Failed to glob',
      browseState.namespace(), browseState.globQuery(),
      err, (err && err.stack) ? err.stack : undefined
    );
  });

  // trigger display items event
  browseEvents.selectedItemDetails.displayItemDetails({
    name: data.namespace
  });

  function emptyOutItems() {
    // TODO(aghassemi)
    // any better way than splice to tell Mercury all of array changed?
    browseState.items.splice(0, browseState.items.getLength());
  }
}

function constructItemStruct(globResultItem) {
  var item = mercury.struct({
    itemName: mercury.value(globResultItem.name),
    mountedName: mercury.value(globResultItem.mountedName),
    isGlobbable: mercury.value(false)
  });

  // async call to set isGlobbable
  browseService.isGlobbable(globResultItem.name).then(function(isGlobbable) {
    item.isGlobbable.set(isGlobbable);
  });
  return item;
}