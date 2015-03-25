// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var through2 = require('through2');

module.exports = transform;

/*
 * A list of specialist transformers targetting specific filetypes.
 */
var transformers = Object.freeze([
  require('./css-transform'),
  require('./md-transform')
]);

/*
 * Apply a transform to any given file. Most files are simply passed through,
 * but a matching specialist transformer applies its transform function instead.
 */
function transform(file) {
  // Attempt to find a specialist transformer to apply their transformation.
  for (var i = 0; i < transformers.length; i++) {
    if (transformers[i].canTransform(file)) {
      return transformers[i].transform(file);
    }
  }

  // If there's no result, pass the file through normally.
  return through2();
}