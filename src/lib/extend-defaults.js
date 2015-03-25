// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var extend = require('extend');

module.exports = extendDefaults;

/*
 * Behaves like extend but does not copy over null values from the obj
 */
function extendDefaults(defaults, obj) {
  if (obj) {
    // Remove all properties with null values, since extend does not do that
    Object.keys(obj).forEach(function(key) {
      if (obj[key] === null) {
        delete obj[key];
      }
    });
  }

  return extend(defaults, obj);
}