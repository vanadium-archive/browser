// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = function(routes) {
  routes.addRoute('/demo', handleDemoRoute);
};

module.exports.createUrl = function() {
  return '#/demo';
};

function handleDemoRoute(state) {

  // If already initialized, reload the page in demo mode
  if (state.initialized()) {
    setTimeout(function() {
      window.location.reload();

      // Give time for the sidebar to close so interaction feels more natural
    }, 300);
  } else {
    // Set demo true
    state.demo.set(true);
  }
}