// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var h = require('mercury').h;
var histogram = require('bars');

module.exports = {
  'shouldFormat': shouldFormat,
  'format': format
};

/*
 * Format if the appropriate histogram fields are present.
 * TODO(alexfandrianto): Negotiate a better way of identifying histogram data.
 */
function shouldFormat(input) {
  return input.count !== undefined && input.sum !== undefined &&
    input.buckets !== undefined;
}

/*
 * The histogram is formatted with bars (a fork of ascii-histogram).
 * TODO(alexfandrianto): Consider using a prettier formatting package.
 */
function format(input) {
  var histData = {};
  input.buckets.forEach(function(obj) {
    histData[obj.lowBound] = obj.count;
  });
  return h('span', histogram(histData, { bar: '*', width: 20 }));
}