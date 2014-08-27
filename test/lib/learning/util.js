var test = require('prova');
var util = require('../../../src/lib/learning/util');

test('dot product', function(t) {
  t.equals(util.dotProduct({'a': 3}, {}), 0);
  t.equals(util.dotProduct({'a': 3}, {'b': 2}), 0);
  t.equals(util.dotProduct({'a': 3}, {'a': 2}), 6);
  t.equals(util.dotProduct({'a': 3, 'b': 4}, {'b': 1}), 4);
  t.equals(util.dotProduct({'a': 3, 'b': 4}, {'a': 3, 'b': 1}), 13);

  t.end();
});

test('norm', function(t) {
  t.equals(util.norm({}), 0);
  t.equals(util.norm({'a': 4}), 4);
  t.equals(util.norm({'a': 4, 'b': 3}), 5);
  t.end();
});

test('cossim', function(t) {
  t.equals(util.cossim({}, {}), 0);
  t.equals(util.cossim({'a': 3}, {'b': 2}), 0);
  t.equals(util.cossim({'a': 0.8, 'b': 0.6}, {'a': -1}), -0.8);

  var a = {};
  var b = {'first': 8, 'second': 6};
  var c = {'second': 3, 'third': 4};
  var d = {'first': 4, 'second': 3};

  t.equals(util.cossim(b, a), 0);
  t.equals(util.cossim(b, b), 1);
  t.equals(util.cossim(b, c), 0.36);
  t.equals(util.cossim(b, d), 1);

  t.end();
});