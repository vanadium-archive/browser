// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vdl = require('./ifc');

module.exports = PetFeeder;

var MAX_FILL = 1.0;

// PetFeeder allows clients to remotely feed their pets.
function PetFeeder() {
  this.state = 0;
}

PetFeeder.prototype = new vdl.PetFeeder();

// Status returns the current status of the Pet Feeder
PetFeeder.prototype.status = function(context, serverCall) {
  return this.state;
};

// Fill fills the pet feeder bowl with food. Errors if the bowl will overflow.
PetFeeder.prototype.fill = function(context, serverCall, amount) {
  this.state += amount;
  if (this.state > MAX_FILL) {
    this.state = MAX_FILL;
    throw new Error('pet feeder overflowed');
  }
};

// Empty removes all food from the pet feeder bowl.
PetFeeder.prototype.empty = function(context, serverCall) {
  this.state = 0;
};
