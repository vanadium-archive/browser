// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = setMercuryArray;

// TODO(alexfandrianto): observ-array's set() method works properly in 3.0.0,
// but mercury doesn't depend on that version yet. Use set() when it is.
function setMercuryArray(o, newArray) {
  o.splice(0, o.getLength());
  newArray.forEach(function(entry) {
    o.push(entry);
  });
}