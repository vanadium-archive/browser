// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var browseRoute = require('./browse');
var store = require('../lib/store');

var log = require('../lib/log')('routes:index');

module.exports = function(routes) {
  routes.addRoute('/', handleIndexRoute);
};

function handleIndexRoute(state, events) {
  // TODO(aghassemi) What's the prod address?, do we even want to point to
  // v.io by default?
  var index = '/ns.dev.v.io:8101';
  store.getValue('index').then(function(storedIndex) {
    if (storedIndex) {
      index = storedIndex;
    }

    // Redirect to browse
    events.navigation.navigate({
      path: browseRoute.createUrl(state.browse(), {
        namespace: index
      })
    });
  }).catch(function(err) {
    log.warn('Unable to access stored index', err);

    // Redirect to browse
    events.navigation.navigate({
      path: browseRoute.createUrl(state.browse(), {
        namespace: index
      })
    });
  });
}
