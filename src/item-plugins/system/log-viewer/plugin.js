// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

require('./index.js');

module.exports = {
  title: 'Log Viewer',
  canSupport: canSupport,
  render: render
};

function canSupport(name, signature) {
  // Log Viewer supports all names
  return false; //TODO(aghassemi) enable when completed
}

function render(name, signature) {
  var logViewer = document.createElement('viz-plugins-log-viewer');
  logViewer.vname = name;

  return logViewer;
}
