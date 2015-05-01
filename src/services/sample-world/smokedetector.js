// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vdl = require('./ifc');

module.exports = SmokeDetector;

var DETECTING = 'smoky'; // jshint ignore:line
var NOT_DETECTING = 'normal';
var DEFAULT_SENSITIVITY = 10;
var TEST_DURATION = 1500;

// SmokeDetector allows clients to monitor and adjust a smoke detector.
function SmokeDetector() {
  this.state = NOT_DETECTING;
  this.sense = DEFAULT_SENSITIVITY;
  this.handle = null;
}

SmokeDetector.prototype = new vdl.SmokeDetector();

// Status retrieves the current status and sensitivity of the SmokeDetector.
SmokeDetector.prototype.status = function(context, serverCall) {
  return [this.state, this.sense];
};

// Test the SmokeDetector to check if it is working.
SmokeDetector.prototype.test = function(context, serverCall, cb) {
  var self = this;

  // Wait until the TEST_DURATION is over.
  // Then succeed only if sensitivity is positive.
  setTimeout(function() {
    cb(null, self.sense > 0);
  }, TEST_DURATION);
};

// Sensitivity adjusts the SmokeDetector's sensitivity to smoke.
SmokeDetector.prototype.sensitivity =
  function(context, serverCall, sensitivity) {

  this.sense = sensitivity;
};