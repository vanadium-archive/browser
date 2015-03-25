// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = {
  dotProduct: dotProduct,
  norm: norm,
  cossim: cossim
};

/*
 * Computes the dot product of these two objects.
 */
function dotProduct(a, b) {
  var sum = 0.0;
  for (var key in a) {
    if (a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
      sum += a[key] * b[key];
    }
  }
  return sum;
}

/*
 * Computes the norm of the given object.
 */
function norm(a) {
  return Math.sqrt(dotProduct(a, a));
}

/*
 * Computes the cosine similarity of these two objects.
 */
function cossim(a, b) {
  var cs = dotProduct(a, b);
  if (cs !== 0) { // This check prevents dividing by a 0 norm.
    cs /= norm(a) * norm(b);
  }
  return cs;
}