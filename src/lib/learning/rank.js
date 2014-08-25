module.exports = {
  getBestKItems: getBestKItems,
  getBestItem: getBestItem
};

/*
 * Given an array of scored items, find and return the top k scored items.
 * These top k scored items should be sorted from highest to lowest.
 * A scored item has an item and score attribute.
 * Note: Order is not specified for ties.
 * Note: Returns null in invalid scenarios.
 *
 * TODO(alexfandrianto): We can improve this algorithm by using a heap O(n*logk)
 * or using Hoare's algorithm and median of medians O(n + k*logk).
 */
function getBestKItems(scoredItems, k) {
  if (k < 0 || scoredItems.length === 0) {
    return null;
  }
  // Shallow copy the scoredItems array to avoid modifying it.
  var sItems = scoredItems.slice(0, scoredItems.length);

  // Sort and return the top k items.
  sItems.sort(function(a, b) {
    return b.score - a.score; // descending sort
  });

  // Return the top k items
  return sItems.slice(0, Math.min(k, scoredItems.length));
}

/*
 * Given an array of scored items, find and return the highest scored item.
 * A scored item has an item and score attribute.
 * Note: Order is not specified for ties.
 * Note: Returns null if there is no best item.
 */
function getBestItem(scoredItems) {
  var maxScoredItem = null;
  for (var i = 0; i < scoredItems.length; i++) {
    var scoredItem = scoredItems[i];
    if (maxScoredItem === null || scoredItem.score > maxScoredItem.score) {
      maxScoredItem = scoredItem;
    }
  }
  return maxScoredItem;
}