// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var test = require('prova');
var freeze = require('../../../../src/lib/mercury/freeze');

test('freeze observ-array', function(t) {
  var mutableObsArray = mercury.array(['foo']);
  var immutableObsArray = freeze(mutableObsArray);

  assertIsImmutableArray(t, immutableObsArray);

  // new observables returned by methods like map, filter are immutable
  var mappedResult = immutableObsArray.map(function(item ) {
    return item;
  });
  assertIsImmutableArray(t, mappedResult, 'result of map is immutable');

  // it can be observed when source is mutated
  immutableObsArray(function(result) {
    t.equals(result[1], 'bar', 'observable');
    t.end();
  });
  mutableObsArray.push('bar');

});

function assertIsImmutableArray(t, obs) {
  // no mutable method exists
  t.ok(obs.set === undefined, 'no set method');
  t.ok(obs.splice === undefined, 'no splice method');
  t.ok(obs.put === undefined, 'no put method');

  // immutable methods are still there
  ['concat', 'slice', 'every', 'filter', 'forEach', 'indexOf',
   'join', 'lastIndexOf', 'map', 'reduce', 'reduceRight',
   'some', 'toString', 'toLocaleString' ].forEach(function(name) {
      t.ok(obs[name] !== undefined, name + ' method exists.');
    });
}