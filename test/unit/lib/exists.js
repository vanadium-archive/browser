// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var exists = require('../../../src/lib/exists');

test('exists true', function(t) {
  // Normal Cases
  t.equal(exists('a'), true); // truthy string
  t.equal(exists(3), true); // truthy number
  t.equal(exists(true), true); // truthy bool
  t.equal(exists(['hello']), true); // single defined element
  t.equal(exists(['a', 'b', 4]), true); // multiple defined elements

  // Edge Cases
  t.equal(exists(''), true); // empty string
  t.equal(exists(0), true); // 0
  t.equal(exists(false), true); // false
  t.equal(exists([]), true); // empty array
  t.equal(exists({}), true); // empty object

  t.end();
});

test('exists false', function(t) {
  // Normal Cases
  t.equal(exists(undefined), false); // undefined
  t.equal(exists(null), false); // null
  t.equal(exists([].size), false); // undefined attribute
  t.equal(exists(['a', 'b', undefined]), false); // any element doesn't exist
  t.equal(exists([null, null]), false); // multiple elements don't exist

  t.end();
});