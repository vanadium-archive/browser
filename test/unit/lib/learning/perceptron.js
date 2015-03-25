// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var perceptron = require('../../../../src/lib/learning/perceptron');

test('perceptron predict', function(t) {
  var weightless = {};
  var featureless = {};
  var weightABC = {
    A: 3,
    B: -1,
    C: 2
  };
  var weightACD = {
    A: 4,
    C: 2,
    D: 0
  };
  var featuresB = {
    B: 1.5
  };
  var featuresBCD = {
    B: 0.5,
    C: 1,
    D: -2
  };

  // No weights
  t.equal(
    perceptron.predict(weightless, featuresB),
    0
  );

  // No features
  t.equal(
    perceptron.predict(weightACD, featureless),
    0
  );

  // Features and weights, but no match
  t.equal(
    perceptron.predict(weightACD, featuresB),
    0
  );

  // Some overlap between features and weights
  t.equal(
    perceptron.predict(weightABC, featuresB),
    -1.5
  );
  t.equal(
    perceptron.predict(weightABC, featuresBCD),
    1.5
  );
  t.equal(
    perceptron.predict(weightACD, featuresBCD),
    2
  );

  t.end();
});

function fuzzyEquals(a, b) {
  var TINY = 0.000000001;
  if (a === b) {
    return true;
  }
  if (a - TINY < b && a + TINY > b) {
    return true;
  }
  return false;
}

test('perceptron update', function(t) {
  // Do nothing
  var weights = {};
  perceptron.update(weights, {}, 1, 0.1);
  t.deepEqual(weights, {});

  // No weights => new weights
  perceptron.update(weights, {A: 3, B: 2}, 1, 0.1);
  t.deepEqual(weights, {A: 3*0.1, B: 2*0.1}); // floating point issues

  // No features => no change
  perceptron.update(weights, {}, 1, 0.1);
  t.deepEqual(weights, {A: 3*0.1, B: 2*0.1}); // floating point issues

  // Some overlap between features and weights
  var features = {B: 3, C: -1};
  var expected = {
    A: 0.3,
    B: 0.62,
    C: -0.14
  };
  perceptron.update(weights, features, 2, 0.1);
  for (var key in weights) {
    if (weights.hasOwnProperty(key)) {
      t.ok(fuzzyEquals(weights[key], expected[key]));
    }
  }

  t.end();
});