// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var browseRoute = require('./browse');

module.exports = function(routes) {
  routes.addRoute('/', handleIndexRoute);
};

function handleIndexRoute(state, events) {
  // Send the user to the browse route with their current namespace.
  events.navigation.navigate({
    path: browseRoute.createUrl(state.browse(), {
      namespace: state.browse.namespace()
    })
  });
}
