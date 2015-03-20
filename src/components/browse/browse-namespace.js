var Bookmarks = require('./bookmarks/index.js');
var Recommendations = require('./recommendations/index.js');
var Items = require('./items/index.js');

var extendDefaults = require('../../lib/extend-defaults');
var log = require('../../lib/log')('components:browse:browse-namespace');

module.exports = browseNamespace;

// We keep track of previous namespace that was browsed to so we can
// know when navigating to a different namespace happens.
var previousNamespace;

/*
 * Default event handler for the browseNamespace event.
 * Updates the necessary states when browseNamespace is triggered
 * Data is of the form
 * {
 *   namespace: '/vanadium/name/space',
 *   globQuery: '*',
 * }
 */
function browseNamespace(browseState, browseEvents, data) {
  var defaults = {
    namespace: '',
    globQuery: '',
    subPage: 'items',
    viewType: 'tree'
  };

  data = extendDefaults(defaults, data);

  if (!Items.trySetViewType(browseState.items, data.viewType)) {
    error404('Invalid view type: ' + data.viewType);
    return;
  }

  browseState.namespace.set(data.namespace);
  browseState.globQuery.set(data.globQuery);
  browseState.subPage.set(data.subPage);

  var namespace = browseState.namespace();
  var globQuery = browseState.globQuery() || '*';
  var subPage = browseState.subPage();

  // When navigating to a different namespace, reset the currently selected item
  if (previousNamespace !== namespace) {
    browseState.selectedItemName.set(namespace);
  }
  previousNamespace = namespace;

  browseState.isFinishedLoadingItems.set(false);

  switch (subPage) {
    case 'items':
      Items.load(browseState.items, namespace, globQuery)
        .then(loadingFinished)
        .catch(onError.bind(null, 'items'));
      break;
    case 'bookmarks':
      Bookmarks.load(browseState.bookmarks)
        .then(loadingFinished)
        .catch(onError.bind(null, 'bookmarks'));
      break;
    case 'recommendations':
      Recommendations.load(browseState.recommendations)
        .then(loadingFinished)
        .catch(onError.bind(null, 'recommendations'));
      break;
    default:
      browseState.subPage.set(defaults.subPage);
      error404('Invalid page: ' + browseState.subPage());
      return;
  }

  function onError(subject, err) {
    var message = 'Could not load ' + subject;
    browseEvents.toast({
      text: message,
      type: 'error'
    });
    log.error(message, err);
    loadingFinished();
  }

  function error404(errMessage) {
    log.error(errMessage);
    //TODO(aghassemi) Needs to be 404 error when we have support for 404
    browseEvents.error(new Error(errMessage));
  }

  function loadingFinished() {
    browseState.isFinishedLoadingItems.set(true);
  }

  // Update the right side
  browseEvents.selectedItemDetails.displayItemDetails({
    name: browseState.selectedItemName()
  });
}