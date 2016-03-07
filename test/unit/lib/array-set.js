// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var arraySet = require('../../../src/lib/array-set');

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

  t.notOk(arraySet.set(arr, 'f', true, indexOfBad), 'invalid index =>false');

  t.end();
});