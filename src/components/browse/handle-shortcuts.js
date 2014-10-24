var _ = require('lodash');

module.exports = {
  // load: loadShortcuts, TODO(alexfandrianto): Next CL
  set: setShortcut,
  find: findShortcut
};

/*
 * Update the given browseState with the shortcut information in the given data.
 * data should have 'save' (boolean) and 'item' (@see services/namespace/item).
 */
function setShortcut(browseState, data) {
  // First, find the index of the shortcut if it's already there.
  var index = findShortcut(browseState(), data.item);

  // Then, decide whether to add or remove the item.
  if (data.save && index === -1) { // needs to be added
    browseState.userShortcuts.push(data.item);
  } else if (!data.save && index !== -1) { // needs to be removed
    browseState.userShortcuts.splice(index, 1);
  }
}

/*
 * Check the browseState for the index of the given item. -1 if not present.
 * Note: browseState should be observed.
 */
function findShortcut(browseState, item) {
  return _.findIndex(browseState.userShortcuts, function(shortcut, i) {
    return item.objectName === shortcut.objectName;
  });
}