// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var h = require('mercury').h;

module.exports = {
  'shouldFormat': shouldFormat,
  'format': format
};

/*
 * By default, always format.
 */
function shouldFormat(input) {
  return true;
}

/*
 * By default, the input is returned as prettified JSON.
 */
function format(input) {
  return h('span', JSON.stringify(input, null, 2));
}