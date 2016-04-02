// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var namespaceService = require('../../../../services/namespace/service');

var log = require('../../../../lib/log')(
  'components:browse:item-details:mount-point:display-mountpoint-details'
);

module.exports = displayMountPointDetails;

// Holds name of the last requested name.
var lastRequestedName;

/*
 * Loads all the information needed to render the mount point details page.
 */
function displayMountPointDetails(state, events, data) {

  var itemObs = data.itemObs;
  var name = itemObs().objectName;

  lastRequestedName = name;

  state.put('item', itemObs);
  state.put('itemName', name);
  state.put('error', null);
  state.put('showLoadingIndicator', false);
  state.put('notAuthorizedToSeePermissions', false);
  state.put('objectAddresses', '');

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
    loadPermissions(),
    resolveToMounttable()
  ]);

  return allPromises.then(function() {
    // Indicate we finished loading
    setIsLoaded();
  }).catch(function(err) {
    log.error('Error while getting mount point details for', name, err);
    if (!isCurrentlySelected()) {
      return;
    }
    events.toast({
      text: 'Error while getting mount point details for:' + name,
      type: 'error'
    });
    state.put('error', err);
    setIsLoaded();
  });

  function loadPermissions() {
    // Protect this call; this must be the selected item.
    if (!isCurrentlySelected()) {
      return;
    }

    return namespaceService.getPermissions(name).then(function(permissions) {
      if (permissions) {
        state.put('permissions', permissions);
      }
    }).catch(function(err) {
      // TODO(alexfandrianto): We don't have access to VErrors, so this is the
      // closest we can get to determining "notAuthorizedToSeePermissions".
      if (err.toString().contains('NoAccess')) {
        state.put('notAuthorizedToSeePermissions', true);
      }
      log.error('Failed to get mountpoint permissions for:', name, err);
      state.put('permissions', null);
    });
  }

  function resolveToMounttable() {
    // Protect this call; this must be the selected item.
    if (!isCurrentlySelected()) {
      return;
    }

    return namespaceService.resolveToMounttable(name).then(function(eps) {
      state.put('objectAddresses', eps);
    }).catch(function(err) {
      log.error('Failed to resolve to mounttable for:', name, err);
      state.put('parentMounttable', '');
      state.put('suffix', '');
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