var test = require('prova');
var rank = require('../../../src/lib/learning/rank');

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

  t.end();
});