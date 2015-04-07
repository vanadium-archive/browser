// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');

var methodNameToVarHashKey = require('./methodNameToVarHashKey');
var methodStart = require('./method-start.js');
var methodEnd = require('./method-end.js');

var methodForm = require('../method-form/index.js');

var namespaceService = require('../../../../services/namespace/service');

var log = require('../../../../lib/log')(
  'components:browse:item-details:server:display-server-details'
);

module.exports = displayServerDetails;

// Holds name of the last requested name.
var lastRequestedName;

/*
 * Loads all the information needed to render the server details page.
 */
function displayServerDetails(state, events, data) {

  var itemObs = data.itemObs;
  var name = itemObs().objectName;

  // Return if we are already on that item.
  if (isCurrentlySelected()) {
    return;
  }

  lastRequestedName = name;

  state.put('item', itemObs);
  state.put('itemName', name);
  state.put('error', null);
  state.put('signature', null);
  state.put('remoteBlessings', null);
  state.put('objectAddresses', null);
  state.put('showLoadingIndicator', false);

  // Whether we have finished loading yet.
  var isLoaded = false;
  // How long to wait before showing loading if things have not loaded yet
  var SHOW_LOADING_THRESHOLD = 250;
  setTimeout(function maybeShowLoadingIndicator() {
    if (isLoaded || !isCurrentlySelected()) {
      return;
    }
    state.put('showLoadingIndicator', true);
  }, SHOW_LOADING_THRESHOLD);

  var allPromises = Promise.all([
    loadRemoteBlessings(itemObs()),
    loadObjectAddresses(itemObs()),
    loadSignature(itemObs())
  ]);

  return allPromises.then(function() {
    // Indicate we finished loading
    setIsLoaded();
  }).catch(function(err) {
    log.error('Error while getting server details for', name, err);
    if (!isCurrentlySelected()) {
      return;
    }
    events.toast({
      text: 'Error while getting server details for:' + name,
      type: 'error'
    });
    state.put('error', err);
    setIsLoaded();
  });

  function loadRemoteBlessings(item) {
    if (!item.hasServer) {
      return;
    }
    return namespaceService.getRemoteBlessings(name).then(function(rbs) {
      // Protect this call; this must be the selected item.
      if (!isCurrentlySelected()) {
        return;
      }
      state.put('remoteBlessings', rbs);
    });
  }

  function loadObjectAddresses(item) {
    if (!item.hasServer) {
      return;
    }

    return namespaceService.getObjectAddresses(name).then(function(eps) {
      // Protect this call; this must be the selected item.
      if (!isCurrentlySelected()) {
        return;
      }
      state.put('objectAddresses', eps);
    });
  }

  function loadSignature(item) {
    if (!item.hasServer) {
      return;
    }

    return namespaceService.getSignature(name).then(function(signatureResult) {
      // Protect this call; this must be the selected item.
      if (!isCurrentlySelected()) {
        return;
      }

      state.put('signature', signatureResult);

      if (!signatureResult) {
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
        // Note: Some services have more interfaces than others. If a service
        // has fewer than usual, it won't override/delete any extra interfaces.
        // It isn't necessary because those old interfaces won't be rendered.
        state.methodForms.put(i, forms);
        events.methodForms[i] = formEvents;

        // Note: We want the __Reserved interface to be closed by default.
        // It has a common pool of methods that would be distracting in the UI.
        state.methodFormsOpen.put(i, interface.name !== '__Reserved');
      });
    });
  }

  /*
   * Indicates the current request has finished loading
   */
  function setIsLoaded() {
    isLoaded = true;
    state.put('showLoadingIndicator', false);
  }

  /*
   * Returns whether we are still the currently selected item or not
   */
  function isCurrentlySelected() {
    return (name === lastRequestedName);
  }
}