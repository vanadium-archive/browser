// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = registerRoutes;

/*
 * Registers all route handlers.
 */
function registerRoutes(routes) {
  require('./index')(routes);
  require('./help')(routes);
  require('./browse')(routes);
  require('./error')(routes);
  require('./recommendations')(routes);
  require('./bookmarks')(routes);
  require('./demo')(routes);
}