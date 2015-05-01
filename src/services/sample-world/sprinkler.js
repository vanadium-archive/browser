// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vdl = require('./ifc');

module.exports = Sprinkler;

var ACTIVE = 'active';
var IDLE = 'idle';

// Sprinkler allows clients to control the virtual sprinkler.
function Sprinkler() {
  this.state = IDLE;
  this.handle = null;
}

Sprinkler.prototype = new vdl.Sprinkler();

// Status retrieves the Sprinkler's status (i.e., active, idle)
Sprinkler.prototype.status = function(context, serverCall) {
  return this.state;
};

// Start causes the Sprinkler to emit water for the given duration (in seconds).
Sprinkler.prototype.start = function(context, serverCall, duration) {
  clearTimeout(this.handle); // Clear timeout handle, if any.

  this.state = ACTIVE;
  var self = this;
  this.handle = setTimeout(function() {
    self.state = IDLE;
  }, duration * 1000);
};

// Stop causes the Sprinkler to cease watering.
Sprinkler.prototype.stop = function(context, serverCall) {
  clearTimeout(this.handle); // Clear timeout handle, if any.

  this.state = IDLE;
};