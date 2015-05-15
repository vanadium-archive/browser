// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');

var ServerDetails = require('./server-details');
var MountPointDetails = require('./mount-point-details');

var namespaceService = require('../../../services/namespace/service');
var smartService = require('../../../services/smart/service');
var bookmarkService = require('../../../services/bookmarks/service');

var pluginRegistry = require('../../../item-plugins/registry');
var log = require('../../../lib/log')(
  'components:browse:item-details:display-item-details'
);

module.exports = displayItemDetails;

// Holds name of the last requested name.
var lastRequestedName;

/*
 * Displays the details section for an item which includes <1,n> tabs
 * for server details and/or mount point details and/or plugins
 * and actions such as bookmaking
 */
function displayItemDetails(state, events, data) {
  var name = data.name;

  lastRequestedName = name;

  state.put('plugins', mercury.array([]));
  state.put('error', null);
  state.put('item', null);
  state.selectedTabKey.set(null);
  state.itemName.set(name);
  state.isBookmarked.set(false);

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

  loadBookmark().catch(function(err) {
    log.error('Could not load bookmark status for', name, err);
  });

  return namespaceService.getNamespaceItem(name).then(loadDetails).
  catch(function(err) {
    log.error('Error while loading ', name, err);
    if (!isCurrentlySelected()) {
      return;
    }
    events.toast({
      text: 'Error while loading ' + name,
      type: 'error'
    });
    state.put('error', err);
    setIsLoaded();
  });

  function loadDetails(itemObs) {
    /*
     * Since async call, by the time we are here, a different name
     * might be selected.
     * We don't want out of order results override everything!
     */
    if (!isCurrentlySelected()) {
      return;
    }

    state.put('item', itemObs);

    if (itemObs().hasServer) {
      ServerDetails.displayServerDetails(state.serverDetails,
        events.serverDetails, {
          itemObs: itemObs
        });
    }
    if (itemObs().hasMountPoint) {
      MountPointDetails.displayMountPointDetails(state.mountPointDetails,
        events.mountPointDetails, {
          itemObs: itemObs
        });
    }

    return loadPlugins(itemObs()).then(function() {
      // Log the name to the smart service as a potential shortcut, since it was
      // successfully visited.
      smartService.update('learner-shortcut', {
        name: name
      }).catch(function(err) {
        log.error('Error while updating shortcut learner', err);
      });

      // Indicate we finished loading
      setIsLoaded();
    });
  }

  function loadBookmark() {
    // Asynchronously load the bookmark. It should be quite fast.
    return bookmarkService.isBookmarked(name).then(function(isBookmarked) {
      // Protect this call; this must be the selected item.
      if (!isCurrentlySelected()) {
        return;
      }
      state.isBookmarked.set(isBookmarked);
    });
  }

  function loadPlugins(item) {
    if (!item.hasServer) {
      return Promise.resolve();
    }

    return namespaceService.getSignature(name).then(function(sig) {
      // Protect this call; this must be the selected item.
      if (!isCurrentlySelected() || !sig) {
        return;
      }

      // Load plugins
      var plugins = pluginRegistry.matches(name, sig);
      state.put('plugins', plugins);
    }).catch(function(err) {
      log.warn('Could not load any plugins because could not load signature',
        name, err);
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