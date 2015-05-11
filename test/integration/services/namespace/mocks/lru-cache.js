// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Mocking the LRU cache so we can test caching logic
module.exports = {
  cache: {},
  getCallHits: {},
  get: function(key) {
    this.getCallHits[key] = (this.cache[key] !== undefined);
    return this.cache[key];
  },
  set: function(key, val) {
    this.cache[key] = val;
  },
  reset: function() {
    this.getCallHits = {};
    this.cache = {};
  },
  has: function(key) {
    return this.cache[key] !== undefined;
  },
  del: function(key) {
    delete this.cache[key];
  },
  wasCacheHit: function(key) {
    return !!this.getCallHits[key];
  },
  keys: function() {
    return Object.keys(this.cache);
  }
};