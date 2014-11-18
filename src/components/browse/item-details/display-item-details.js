var mercury = require('mercury');
var namespaceService = require('../../../services/namespace/service');
var smartService = require('../../../services/smart/service');
var log = require('../../../lib/log')(
  'components:browse:item-details:display-item-details'
);
var methodForm = require('./method-form/index.js');
var methodStart = require('./method-start.js');
var methodEnd = require('./method-end.js');

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

  // Log the URL to the smart service as a potential shortcut.
  smartService.update('learner-shortcut', {
    name: name
  }).catch(function(err) {
    log.error('Error while updating shortcut learner', err);
  });

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

  namespaceService.getNamespaceItem(name).then(function(itemObs) {

    /*
     * Since async call, by the time we are here, a different name
     * might be selected.
     * We don't want out of order results override everything!
     */
    if (!isCurrentlySelected()) {
      return;
    }

    // Indicate we finished loading
    setIsLoaded();

    state.put('item', itemObs);

    mercury.watch(itemObs, function(item) {
      if (!item.isServer) {
        return;
      }

      // Go through each signature method, preparing the state needed for its
      // form to be rendered and deciding if the method should be recommended.
      var signatureResult = item.serverInfo.signature;
      signatureResult.forEach(function(methodData, m) {
        var form = methodForm();
        state.methodForm.put(m, form.state);
        events.methodForm.put(m, form.events);

        // Hook up the new form's method start, end, and toast events.
        form.events.methodStart(
          methodStart.bind(null, state, m)
        );
        form.events.methodEnd(
          methodEnd.bind(null, state, m)
        );
        form.events.toast = events.toast;

        // Finally, allow the form to gather the info it needs to display.
        form.events.displayMethodForm({
          itemName: name,
          signature: signatureResult,
          methodName: m
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