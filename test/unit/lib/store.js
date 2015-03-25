// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var store = require('../../../src/lib/store');
var _ = require('lodash');

test('store !hasValue', function(t) {
  // A key not present in the store has no value.
  store.hasValue('not in store').then(function(has) {
    t.notOk(has, 'not set => no value');
    t.end();
  }).catch(t.end);
});

test('store hasValue', function(t) {
  var key = 'recoveringKey';
  // Run hasValue between other operations and verify hasValue's output.
  store.setValue('recoveringKey', 'willLoseValue').then(function(value) {
    return store.hasValue(key);
  }).then(function(has) {
    t.ok(has, 'set => has value');
    return store.removeValue(key);
  }).then(function() {
    return store.hasValue(key);
  }).then(function(has) {
    t.notOk(has, 'set => remove => no value');
    return store.setValue(key, 'nowHasValue');
  }).then(function(value) {
    return store.hasValue(key);
  }).then(function(has) {
    t.ok(has, 'set => remove => set => has value');
    t.end();
  }).catch(t.end);
});

test('store get', function(t) {
  // A key not present in the store has null value.
  store.getValue('not in store').then(function(value) {
    t.equal(value, null, 'not in store => null value');
    t.end();
  }).catch(t.end);
});

var setGetTestCases = {
  'simple string is recovered': {
    key: 'key1',
    givenValue: 'potato soup',
    expectedValue: 'potato soup'
  },
  'simple object is recovered': {
    key: 'key2',
    givenValue: { attr: 'red' },
    expectedValue: { attr: 'red' }
  },
  'functions are not stored': {
    key: 'key3',
    givenValue: function() { return 3; },
    expectedValue: null
  },
  'object methods are not stored': {
    key: 'key4',
    givenValue: {
      ok: 1,
      lost: function() { return 1; }
    },
    expectedValue: {
      ok: 1
    }
  },
  'functions in arrays are nulled': {
    key: 'key5',
    givenValue: ['a', 'b', function() { return 'removed'; }, 'd'],
    expectedValue: ['a', 'b', null, 'd']
  }
};

_.forOwn(setGetTestCases, function run(data, msg) {
  test(
    'store set=>get - ' + msg,
    testSetGetExpectations.bind(null, data)
  );
});

function testSetGetExpectations(data, t) {
  store.setValue(data.key, data.givenValue).then(function(value) {
    return store.getValue(data.key);
  }).then(function(value) {
    t.deepEqual(value, data.expectedValue);
    t.end();
  }).catch(t.end);
}

test('store setA=>setB=>get', function(t) {
  var key1 = 'key1';
  var key2 = 'key2';
  var value1 = 'artificial flavors';
  var value2 = { attribute: 'organic' };

  // The last value set wins regardless of the actual values stored.
  store.setValue(key1, value1).then(function(value) { // Store 1 first then 2
    return store.setValue(key1, value2);
  }).then(function(value) {
    return store.getValue(key1);
  }).then(function(value) {
    t.deepEqual(value, value2, 'last value set wins'); // Expect 2
    return store.setValue(key2, value2);               // Store 2 first then 1
  }).then(function(value) {
    return store.setValue(key2, value1);
  }).then(function(value) {
    return store.getValue(key2);
  }).then(function(value) {
    t.deepEqual(value, value1, 'last value set wins'); // Expect 1
    t.end();
  }).catch(t.end);
});

test('store set=>remove=>get', function(t) {
  // A removed key will have no value in the store.
  var key = 'will be removed';
  var value = 'not null';
  store.setValue(key, value).then(function(value) {
    return store.removeValue(key);
  }).then(function() {
    return store.getValue(key);
  }).then(function(value) {
    t.equal(value, null, 'a removed key has no value');
    t.end();
  }).catch(t.end);
});

test('store remove=>set=>get', function(t) {
  // A removed key is not permanent; it can be set to again.
  var key = 'will be removed and set again';
  var val = 'not null';
  store.removeValue(key).then(function() {
    return store.setValue(key, val);
  }).then(function(value) {
    return store.getValue(key);
  }).then(function(value) {
    t.deepEqual(value, val, 'a removed key can still set a value');
    t.end();
  }).catch(t.end);
});

test('store getKeysWithPrefix', function(t) {
  // Set abc, abcd, ab, and rea in the store.
  // Then verify prefix matches for abc, a, and x.
  store.setValue('abc', 4).then(function(value) { // Preload data at abc
    return store.setValue('abcd', 'a');           // Preload data at abcd
  }).then(function(value) {
    return store.setValue('ab', []);              // Preload data at ab
  }).then(function(value) {
    return store.setValue('rea', false);          // Preload data at rea
  }).then(function(value) {
    return store.getKeysWithPrefix('abc'); // Verify prefix matches for abc
  }).then(function(keys) {
    t.deepEqual(keys.sort(), ['abc', 'abcd'], 'abc => abc and abcd');
    return store.getKeysWithPrefix('a');   // Verify prefix matches for a
  }).then(function(keys) {
    t.deepEqual(keys.sort(), ['ab', 'abc', 'abcd'], 'a => ab, abc, and abcd');
    return store.getKeysWithPrefix('x');   // Verify prefix matches for x
  }).then(function(keys) {
    t.deepEqual(keys.sort(), [], 'x => empty array');
    t.end();
  }).catch(t.end);
});