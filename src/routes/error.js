// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = function(routes) {
  routes.addRoute('/error', handleErrorRoute);
};

module.exports.createUrl = function() {
  return '#/error';
};

function handleErrorRoute(state) {

  // Set the page to help
  state.navigation.pageKey.set('error');
  state.viewport.title.set('Error');
}