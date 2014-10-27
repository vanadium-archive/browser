module.exports = {
  set: set,
  add: add,
  remove: remove
};

/*
 * This is a utility function for arrays being used as ordered sets.
 * If shouldSet is true, add the item to the array set. Otherwise, remove it.
 * If no changes are needed, nothing happens.
 * The function returns whether or not the array was modified.
 *
 * Note: indexOfCallback should be used if a custom indexOf function is needed.
 * If indexOfCallback is omitted, then array.indexOf will be used by default.
 */
function set(array, item, shouldSet, indexOfCallback) {
  var index = indexOfCallback ? indexOfCallback(item) : array.indexOf(item);
  if (shouldSet && index === -1) { // need to add
    array.push(item);
    return true;
  } else if (!shouldSet && index !== -1) { // need to remove
    array.splice(index, 1);
    return true;
  }
  return false; // did nothing
}

/*
 * Wrapper for set that attempts to add the item to the array set.
 */
function add(array, item, indexOfCallback) {
  return set(array, item, indexOfCallback, true);
}

/*
 * Wrapper for set that attempts to remove the item from the array set.
 */
function remove(array, item, indexOfCallback) {
  return set(array, item, indexOfCallback, false);
}