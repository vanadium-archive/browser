// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vdl = require('./ifc');

module.exports = Alarm;

var UNARMED = 'unarmed';
var ARMED = 'armed';
var PANICKING = 'panicking';

// Alarm allows clients to manipulate an alarm and query its status.
function Alarm() {
  this.state = UNARMED;
}

Alarm.prototype = new vdl.Alarm();

// Status returns the current status of the Alarm
// (i.e., armed, unarmed, panicking).
Alarm.prototype.status = function(context, serverCall) {
  return this.state;
};

// Arm sets the Alarm to the armed state
Alarm.prototype.arm = function(context, serverCall) {
  this.state = ARMED;
};

// DelayArm sets the Alarm to the armed state after the given delay in seconds.
Alarm.prototype.delayArm = function(context, serverCall, delay) {
  var self = this;
  setTimeout(function() {
    self.state = ARMED;
  }, delay * 1000);
};

// Unarm sets the Alarm to the unarmed state.
Alarm.prototype.unarm = function(context, serverCall) {
  this.state = UNARMED;
};

// Panic sets the Alarm to the panicking state.
Alarm.prototype.panic = function(context, serverCall) {
  this.state = PANICKING;
};