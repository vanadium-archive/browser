// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var log = require('../../../lib/log')(
  'components:browse:item-details:format-detail');

/*
 * The plugins listed here are listed in order with highest priority first.
 * Plugins must export functions shouldFormat(input) and format(input).
 * The default plugin should always be last.
 */
var plugins = [
  require('./plugins/empty.js'),
  require('./plugins/error.js'),
  require('./plugins/histogram.js'),
  require('./plugins/default.js')
];

module.exports = formatDetail;

/*
 * Transforms the input into the desired detail output.
 * Various plugins are tested until the correct one is found.
 * With the default plugin, this should always return something.
 */
function formatDetail(input) {
  for (var i = 0; i < plugins.length; i++) {
    if (plugins[i].shouldFormat(input)) {
      return plugins[i].format(input);
    }
  }
  log.error('No plugins rendered the detail', input);
}
