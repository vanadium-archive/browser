// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vdl = require('./ifc');

module.exports = LightSwitch;

var ON = 'on';
var OFF = 'off';

// LightSwitch allows clients to manipulate a virtual light switch.
function LightSwitch() {
  this.state = OFF;
}

LightSwitch.prototype = new vdl.LightSwitch();

LightSwitch.prototype.status = function(context, serverCall) {
  return this.state;
};

LightSwitch.prototype.flipSwitch = function(context, serverCall, toOn) {
  this.state = toOn ? ON : OFF;
};