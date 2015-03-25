// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var insertCss = require('insert-css');

var ErrorBox = require('./error-box/index');

var css = require('./index.css');

var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Help view
 */
function create() {

  var state = mercury.struct({
    /*
     * Detailed description of error
     * @type {string}
     */
    message: mercury.value('')
  });

  return {
    state: state
  };
}

function render(state) {
  insertCss(css);

  var errorTitle = 'Something went wrong :(';
  return h('div.error-page', ErrorBox.render(errorTitle, state.message));
}