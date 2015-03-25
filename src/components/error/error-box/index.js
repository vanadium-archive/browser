// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var insertCss = require('insert-css');

var css = require('./index.css');

var h = mercury.h;

module.exports.render = render;

/*
 * Renders an error in a box with details section
 * @param message {string} errTitle short error title
 * @param details {string} details Error details
 */
function render(errTitle, details) {
  insertCss(css);

  var titleView = h('div.error-box-title', [
    h('core-icon.error-box-icon', {
      attributes: {
        icon: 'error'
      }
    }),
    h('span', errTitle)
  ]);

  var detailsView = h('div.error-box-details', h('span', details));

  return h('div.error-box', [titleView, detailsView]);
}