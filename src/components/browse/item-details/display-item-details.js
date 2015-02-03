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
var lastRequestedName;

/*
 * Ask the namespaceService for a service signature.
 * Use the signature and smartService to pick which RPCs to do automatically.
 */
function displayItemDetails(state, events, data) {
  var name = data.name;

  // Return if we are already on that item.
  if (isCurrentlySelected()) {
    return;
  }

  lastRequestedName = name;

  state.put('error', null);
  state.itemName.set(name);

  // Whether we have finished loading yet.
  var isLoaded = false;
  // How long to wait before showing loading if things have not loaded yet
  var SHOW_LOADING_THRESHOLD = 250;
  setTimeout(function maybeShowLoadingIndicator() {
    if (isLoaded || !isCurrentlySelected()) {
      return;
    }
    state.showLoadingIndicator.set(true);
  }, SHOW_LOADING_THRESHOLD);

  var getItem = Promise.all([
    //TODO(aghassemi) If isBookmarked fails, we are not showing anything
    //ideally, we only remove the bookmark related UI and still show the rest.
    bookmarkService.isBookmarked(name),
    namespaceService.getNamespaceItem(name)
  ]);

  var isBookmarked;
  var itemObs;
  getItem.then(function loadSignature(results) {
    /*
     * Since async call, by the time we are here, a different name
     * might be selected.
     * We don't want out of order results override everything!
     */
    if (!isCurrentlySelected()) {
      return;
    }

    isBookmarked = results[0];
    itemObs = results[1];
    state.put('item', itemObs);
    state.isBookmarked.set(isBookmarked);

    if (itemObs().isServer) {
      return namespaceService.getSignature(name);
    } else {
      return null;
    }
  }).then(function setStateAndFinishLoading(signatureResult) {

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

    // Indicate we finished loading
    setIsLoaded();

    state.put('signature', signatureResult);

    if (!itemObs().isServer || !signatureResult) {
      return;
    }

    // Go through each signature method from each interface. Prepare the state
    // needed for the form to be rendered and its events to function.
    signatureResult.forEach(function(interface, i) {
      var forms = mercury.varhash();
      var formEvents = mercury.varhash();

      interface.methods.forEach(function(methodData) {
        var methodName = methodData.name;
        var methodKey = methodNameToVarHashKey(methodName);
        var form = methodForm();
        forms.put(methodKey, form.state);
        formEvents.put(methodKey, form.events);

        // Hook up the new form's method start, end, and toast events.
        form.events.methodStart(
          methodStart.bind(null, state, methodName)
        );
        form.events.methodEnd(
          methodEnd.bind(null, state, methodName, interface)
        );
        form.events.toast = events.toast;

        // Finally, allow the form to gather the info it needs to display.
        form.events.displayMethodForm({
          itemName: name,
          interface: interface,
          methodName: methodName
        });
      });

      // Save the method forms, events, open-status of each interface.
      // Note: Some services have more interfaces than others. If a service has
      // fewer than usual, it won't override/delete any extra interfaces. It
      // isn't necessary because those old interfaces won't be rendered.
      state.methodForms.put(i, forms);
      events.methodForms[i] = formEvents;

      // Note: We want the __Reserved interface to be closed by default.
      // It has a common pool of methods that would be distracting in the UI.
      state.methodFormsOpen.put(i, interface.name !== '__Reserved');
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
    state.put('error', err);
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
