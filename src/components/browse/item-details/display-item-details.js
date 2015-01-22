var mercury = require('mercury');

var methodNameToVarHashKey = require('./methodNameToVarHashKey');
var methodStart = require('./method-start.js');
var methodEnd = require('./method-end.js');

var methodForm = require('./method-form/index.js');

var namespaceService = require('../../../services/namespace/service');
var bookmarkService = require('../../../services/bookmarks/service');
var smartService = require('../../../services/smart/service');

var log = require('../../../lib/log')(
  'components:browse:item-details:display-item-details'
);

module.exports = displayItemDetails;

// Holds name of the last requested name.
var lastRequestedName = '';

/*
 * Ask the namespaceService for a service signature.
 * Use the signature and smartService to pick which RPCs to do automatically.
 */
function displayItemDetails(state, events, data) {
  var name = data.name;
  lastRequestedName = name;

  // Whether we have finished loading yet.
  var isLoaded = false;
  // How long to wait before showing loading if things have not loaded yet
  var SHOW_LOADING_THRESHOLD = 500;
  setTimeout(function maybeShowLoadingIndicator() {
    if (isLoaded || !isCurrentlySelected()) {
      return;
    }
    state.showLoadingIndicator.set(true);
  }, SHOW_LOADING_THRESHOLD);

  var resultsPromise = Promise.all([
    bookmarkService.isBookmarked(name),
    namespaceService.getNamespaceItem(name)
  ]);

  resultsPromise.then(function(results) {
    /*
     * Since async call, by the time we are here, a different name
     * might be selected.
     * We don't want out of order results override everything!
     */
    if (!isCurrentlySelected()) {
      return;
    }

    // Log the name to the smart service as a potential shortcut, since it was
    // successfully visited.
    smartService.update('learner-shortcut', {
      name: name
    }).catch(function(err) {
      log.error('Error while updating shortcut learner', err);
    });

    var isBookmarked = results[0];
    var itemObs = results[1];

    // Indicate we finished loading
    setIsLoaded();

    state.put('item', itemObs);

    state.isBookmarked.set(isBookmarked);

    mercury.watch(itemObs, function(item) {
      if (!item.isServer) {
        return;
      }

      // Go through each signature method, preparing the state needed for its
      // form to be rendered and deciding if the method should be recommended.
      var signatureResult = item.serverInfo.signature;
      signatureResult.forEach(function(methodData, methodName) {
        var methodKey = methodNameToVarHashKey(methodName);
        var form = methodForm();
        state.methodForm.put(methodKey, form.state);
        events.methodForm.put(methodKey, form.events);

        // Hook up the new form's method start, end, and toast events.
        form.events.methodStart(
          methodStart.bind(null, state, methodName)
        );
        form.events.methodEnd(
          methodEnd.bind(null, state, methodName)
        );
        form.events.toast = events.toast;

        // Finally, allow the form to gather the info it needs to display.
        form.events.displayMethodForm({
          itemName: name,
          signature: signatureResult,
          methodName: methodName
        });
      });
    });
  }).catch(function(err) {
    log.error('Error while getting details for', name, err);
    if (!isCurrentlySelected()) {
      return;
    }
    events.toast({
      text: 'Error while getting details for:' + name,
      type: 'error'
    });
    state.put('item', null);
    setIsLoaded();
  });

  /*
   * Indicates the current request has finished loading
   */
  function setIsLoaded() {
    isLoaded = true;
    state.showLoadingIndicator.set(false);
  }

  /*
   * Returns whether we are still the currently selected item or not
   */
  function isCurrentlySelected() {
    return (name === lastRequestedName);
  }
}