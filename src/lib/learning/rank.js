// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var util = require('./util');

module.exports = {
  getBestKItems: getBestKItems,
  getBestItem: getBestItem,
  getBestItemIndex: getBestItemIndex,
  applyDiversityPenalty: applyDiversityPenalty
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
 * Given an array of scored items, find the highest scored item.
 * A scored item has an item and score attribute.
 * Note: Order is not specified for ties.
 * Note: Returns null if there is no best item.
 */
function getBestItem(scoredItems) {
  var index = getBestItemIndex(scoredItems);
  if (index === -1) {
    return null;
  }
  return scoredItems[index];
}

/*
 * Given an array of scored items, find the index of the highest scored item.
 * A scored item has an item and score attribute.
 * Note: Order is not specified for ties.
 * Note: Returns -1 if there is no best item.
 */
function getBestItemIndex(scoredItems) {
  var maxScoredItemIndex = -1;
  var maxScoredItem = null;
  for (var i = 0; i < scoredItems.length; i++) {
    var scoredItem = scoredItems[i];
    if (maxScoredItem === null || scoredItem.score > maxScoredItem.score) {
      maxScoredItemIndex = i;
      maxScoredItem = scoredItem;
    }
  }
  return maxScoredItemIndex;
}

/*
 * Given scored items, penalize the scored items based on their similarity to
 * a reference scored item.
 * A scored item has an item and score attribute.
 * The extractor takes an item and returns a map[string]float64
 * The penalty is a float64.
 */
function applyDiversityPenalty(scoredItems, otherItem, extractor, penalty) {
  var oFeatures = extractor(otherItem.item);

  // Penalize the other item's score based on the cosine similarity.
  for (var i = 0; i < scoredItems.length; i++) {
    var iFeatures = extractor(scoredItems[i].item);
    var cossim = util.cossim(iFeatures, oFeatures);
    scoredItems[i].score -= cossim * penalty;
  }
}