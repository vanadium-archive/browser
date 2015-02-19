var _ = require('lodash');

module.exports = sortedPush;

/*
 * sortedPush can be used to push an item to a sorted array without messing up
 * the ordering. It uses binary search to find the index to insert, so it is
 * faster than re-sorting on every push or using indexOf. It also supports
 * custom sorter functions or string sorters that specify a property on the
 * item to sort based on.
 *
 * @param {mercury.array} obsArray Observable array to push item to.
 * @param {object} item Item to push to array. Can be observable itself.
 * @sorter {string|function} if provided, it will be used to compute the sort
 * ranking of each item, including the item you pass. The sorter may also be the
 * string name of the property to sort by
 */
function sortedPush(obsArray, item, sorter) {
  var valueList = obsArray();
  // If item is an observable itself, get its value
  var valueItem = item;
  if( typeof item === 'function' ) {
    valueItem = item();
  }
  var sortedIndex = _.sortedIndex(valueList, valueItem, sorter);
  obsArray.splice(sortedIndex, 0, item);
}