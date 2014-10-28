var test = require('prova');
var arraySet = require('../../../src/lib/arraySet');

test('arraySet set', function(t) {
  var arr = ['a', 'b', 'c'];
  var arr2 = ['d', 'e', 'f'];
  var indexOfFoolish = function() { return 2; };
  var indexOfBad = function() { return -2; };

  // Normal Cases
  t.ok(arraySet.set(arr, 'd', true), 'add new item => true');
  t.deepEqual(arr, ['a', 'b', 'c', 'd'], 'added new item to the end');

  t.ok(arraySet.set(arr, 'b', false), 'remove old item => true');
  t.deepEqual(arr, ['a', 'c', 'd'], 'removed old item from its index');

  t.notOk(arraySet.set(arr, 'c', true), 'add old item => false');
  t.deepEqual(arr, ['a', 'c', 'd'], 'add old item => no changes');

  t.notOk(arraySet.set(arr, 'e', false), 'remove new item => false');
  t.deepEqual(arr, ['a', 'c', 'd'], 'remove new item => no changes');

  // Normal Cases with callback
  t.notOk(arraySet.set(arr2, 'g', true, indexOfFoolish),
    'add to existing index => false');
  t.deepEqual(arr2, ['d', 'e', 'f'], 'add to existing index => no changes');

  t.ok(arraySet.set(arr2, 'h', false, indexOfFoolish),
    'remove from existing index => true');
  t.deepEqual(arr2, ['d', 'e'], 'remove from existing index => changed');

  // Error Cases
  t.throws(arraySet.set(arr, 'f', true, indexOfBad), 'invalid index => throws');

  t.end();
});