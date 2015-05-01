// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vdl = require('./ifc');

module.exports = PoolHeater;

var ACTIVE = 'active';
var IDLE = 'idle';

var DEFAULT_TEMPERATURE = 60;

// PoolHeater allows clients to control when the pool is being heated.
function PoolHeater() {
  this.state = IDLE;
  this.currTemperature = DEFAULT_TEMPERATURE;
  this.handle = null;
}

PoolHeater.prototype = new vdl.PoolHeater();

// Status retrieves the PoolHeater's status (i.e., active, idle) and temperature
PoolHeater.prototype.status = function(context, serverCall) {
  return [this.state, this.currTemperature];
};

// Start informs the PoolHeater to heat the pool to the given temperature until
// the duration expires.
PoolHeater.prototype.start =
  function(context, serverCall, temperature, duration) {

  clearTimeout(this.handle); // Clear timeout handle, if any.

  // Begin heating.
  this.status = ACTIVE;
  this.currTemperature = temperature;

  // After duration, stop heating.
  var self = this;
  this.handle = setTimeout(function() {
    self.state = IDLE;
    self.currTemperature = DEFAULT_TEMPERATURE;
  }, duration * 1000);
};

// Stop informs the PoolHeater to cease heating the pool.
PoolHeater.prototype.stop = function(context, serverCall) {
  clearTimeout(this.handle); // Clear timeout handle, if any.

  this.state = IDLE;
  this.currTemperature = DEFAULT_TEMPERATURE;
};