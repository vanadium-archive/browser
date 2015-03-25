// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var pluginRegistry = require('./registry');

// TODO(aghassemi) Do it automatically at build time based on folder structure
// or some other non-code way of registering plugins
var plugins = [
  require('./system/log-viewer/plugin')
];

module.exports = function registerAll() {
  plugins.forEach(function(p) {
    pluginRegistry.register(p);
  });
};