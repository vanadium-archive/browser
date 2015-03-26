// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var insertCss = require('insert-css');

var namespaceService = require('../../services/namespace/service');

var css = require('./index.css');

var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * User Account
 */
function create() {

  var state = mercury.struct({
    /*
     * User's account name
     * @type {string}
     */
    accountName: mercury.value('')
  });

  namespaceService.getAccountName().then(function(accountName) {
    state.accountName.set(accountName);
  });

  return {
    state: state
  };
}

function render(state) {
  insertCss(css);

  return h('core-tooltip.user-icon', {
      attributes: {
        tipAttribute: 'usertip',
        position: 'left'
      }
    }, [
      h('div', {
          attributes: { 'usertip': true }
        },
        h('span.user-account', 'Account name: ' + state.accountName)
      ),
      h('core-icon', {
        icon: 'account-box'
      })
    ]
  );
}
