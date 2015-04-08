// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var insertCss = require('insert-css');

var h = mercury.h;

var css = require('./index.css');

// TODO(aghassemi) we need a separate repo. Update Url when we do.
var QUERY_STRING = '?title=' + 'Namespace Browser: ';
var BUG_REPORT_URL = 'https://github.com/vanadium/issues/issues/new' +
  QUERY_STRING;

var BUG_REPORT_ICON = 'bug-report';

module.exports = create;
module.exports.render = render;
module.exports.BUG_REPORT_URL = BUG_REPORT_URL;
module.exports.BUG_REPORT_ICON = BUG_REPORT_ICON;

function create() {}

function render() {
  insertCss(css);

  var reportBugAction = h('core-tooltip', {
      'label': 'Report a bug or suggest features',
      'position': 'right'
    },
    h('a', {
      'href': BUG_REPORT_URL,
      'target': '_blank'
    }, h('paper-icon-button.icon', {
      attributes: {
        'icon': BUG_REPORT_ICON
      }
    }))
  );
  return h('div.bug-reporter', reportBugAction);
}
