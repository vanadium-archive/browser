// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var util = require('./util');

module.exports = {
  update: perceptronUpdate,
  predict: perceptronPredict
};

/*
 * Update the weights given the input features and associated score.
 * The learning rate modulates the amount the weights are adjusted.
 */
function perceptronUpdate(weights, features, score, learningRate) {
  var delta = score - perceptronPredict(weights, features);
  for (var key in features) {
    if (features.hasOwnProperty(key)) {
      if (weights[key] === undefined) {
        weights[key] = 0;
      }
      // Perceptron update rule.
      weights[key] += features[key] * delta * learningRate;
    }
  }
}

/*
 * Given the weights and input features, compute the predicted score.
 */
function perceptronPredict(weights, features) {
  return util.dotProduct(weights, features);
}