var mercury = require('mercury');
var _ = require('lodash');
var log = require('../../lib/log')('components:browse:handle-shortcuts');
var store = require('../../lib/store');
var namespaceService = require('../../services/namespace/service');

module.exports = {
  load: loadShortcuts,
  set: setShortcut,
  find: findShortcut
};

// Data is loaded from and saved to this key in the store.
var userShortcutsID = 'user-shortcuts';

/*
 * Returns a promise that loads the user's shortcuts into the browse state.
 */
function loadShortcuts(browseState) {
  return loadShortcutKeys().then(function getShortcuts(rawShortcuts) {
    rawShortcuts = rawShortcuts || [];

    // Clear out the old shortcuts and fill them with new ones.
    browseState.put('userShortcuts', mercury.array([]));

    rawShortcuts.forEach(function(rawShortcut, i) {
      namespaceService.getNamespaceItem(rawShortcut).then(
        function(shortcut) {
          browseState.userShortcuts.put(i, shortcut);
        }
      ).catch(function(err) {
        // TODO(alexfandrianto): We should find a way to indicate that the
        // service is not accessible at the moment. A toast is not enough.
        log.error('Could not load shortcut', rawShortcut, err);
      });
    });
  }).catch(function(err) {
    log.error('Unable to load user shortcuts', err);
    return Promise.reject(err);
  });
}

/*
 * Returns a promise that resolves to an array of user-defined shortcut keys.
 */
function loadShortcutKeys() {
  return store.getValue(userShortcutsID);
}

/*
 * Returns a promise that saves the new status of the shortcut key to the store.
 */
function saveShortcutKey(key, shouldSet) {
  return loadShortcutKeys().then(function(keys) {
    var index = keys.indexOf(key);
    if (shouldSet && index === -1) { // needs to be added
      keys.push(key);
    } else if (!shouldSet && index !== -1) { // needs to be removed
      keys.splice(index, 1);
    }
    return store.setValue(userShortcutsID, keys);
  });
}

/*
 * Update the given browseState with the shortcut information in the given data.
 * data should have 'save' (boolean) and 'item' (@see services/namespace/item).
 *
 * This update is done asynchronously; to maintain consistency, shortcuts are
 * refreshed before they are persisted. Additionally, what is rendered in the
 * browseState may not perfectly match the data present in the store.
 */
function setShortcut(browseState, browseEvents, data) {
  // First, find the index of the shortcut if it's already there.
  var index = findShortcut(browseState(), data.item);

  // Then, decide whether to add or remove the item.
  if (data.save && index === -1) { // needs to be added
    browseState.userShortcuts.push(data.item);
  } else if (!data.save && index !== -1) { // needs to be removed
    browseState.userShortcuts.splice(index, 1);
  }

  // Persist the updated user shortcut.
  return saveShortcutKey(data.item.objectName, data.save).catch(function(err) {
    browseEvents.toast({
      text: 'Error while modifying shortcut',
      type: 'error'
    });
    log.error('Error while modifying shortcut', err);
  });
}

/*
 * Check the browseState for the index of the given item. -1 if not present.
 * Note: browseState should be observed.
 */
function findShortcut(browseState, item) {
  return _.findIndex(browseState.userShortcuts, function(shortcut) {
    // Since shortcuts can be assigned out of order, check for undefined.
    return shortcut !== undefined && item.objectName === shortcut.objectName;
  });
}