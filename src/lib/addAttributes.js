// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = addAttributes;

/*
 * Helper function to add additional attributes to an object.
 * Does not replace existing attributes if already present.
 */
function addAttributes(obj, attrs) {
  for (var key in attrs) {
    if (attrs.hasOwnProperty(key) && !obj.hasOwnProperty(key)) {
      obj[key] = attrs[key];
    }
  }
}