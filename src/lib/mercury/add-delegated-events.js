// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');

module.exports = addDelegatedEvents;

/*
 * Given a list of event names, have mercury's Delegator listenTo them.
 */
function addDelegatedEvents(eventNames) {
  var delegator = mercury.Delegator({
    defaultEvents: false
  });
  eventNames.forEach(function(eventName) {
    delegator.listenTo(eventName);
  });
}