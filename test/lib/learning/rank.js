var test = require('prova');
var rank = require('../../../src/lib/learning/rank');
var util = require('../../../src/lib/learning/util');

var A = { item: 'A', score: 1.5};
var B = { item: 'B', score: 1};
var C = { item: 'C', score: 2};
var D = { item: 'D', score: 0};

test('rank best k', function(t) {
  // Normal Cases
  t.deepEqual(rank.getBestKItems([A, B, C, D], 1), [C]);
  t.deepEqual(rank.getBestKItems([D, C, A, B], 1), [C]); // diff. array order
  t.deepEqual(rank.getBestKItems([A, B, C, D], 2), [C, A]); // sorted descending
  t.deepEqual(rank.getBestKItems([A, B, C, D], 4), [C, A, B, D]);
  t.deepEqual(rank.getBestKItems([A, B, C, D], 9), [C, A, B, D]); // k too large

  // Edge Cases
  t.deepEqual(rank.getBestKItems([A, B, C, D], 0), []);
  t.deepEqual(rank.getBestKItems([A, B], -1), null);
  t.deepEqual(rank.getBestKItems([], 3), null);

  t.end();
});

test('rank best', function(t) {
  // Normal Cases
  t.deepEqual(rank.getBestItem([A, B, C, D]), C);
  t.deepEqual(rank.getBestItem([A, B]), A);
  t.deepEqual(rank.getBestItem([D]), D);
  t.deepEqual(rank.getBestItem([]), null);

  // Normal Cases (index)
  t.deepEqual(rank.getBestItemIndex([A, B, C, D]), 2);
  t.deepEqual(rank.getBestItemIndex([A, B]), 0);
  t.deepEqual(rank.getBestItemIndex([D]), 0);
  t.deepEqual(rank.getBestItemIndex([]), -1);

  t.end();
});

test('apply diversity penalty', function(t) {
  var idExtractor = function(a) { return a; };
  var a = {};
  var b = {'first': 8, 'second': 6};
  var c = {'second': 3, 'third': 4};
  var d = {'first': 4, 'second': 3};

  var aScore = 2;
  var cScore = 4;
  var dScore = 200;

  var scoredItems = [
    {item: a, score: aScore},
    {item: c, score: cScore},
    {item: d, score: dScore}
  ];
  var otherItem = {item: b, score: 3};
  var penalty = 2;
  rank.applyDiversityPenalty(scoredItems, otherItem, idExtractor, penalty);

  t.equals(scoredItems[0].score, aScore);
  // Cossim of b and c is 3*6/(10*5) = .36. And (4 - 2*.36 = 3.28)
  t.equals(scoredItems[1].score, cScore - penalty * util.cossim(b, c));
  // Cossim of b and d is 1, so the loss should be 2.
  t.equals(scoredItems[2].score, dScore - penalty * util.cossim(b, d));
  t.end();
});