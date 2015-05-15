// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
 * Because of the way Mercury captures and delegates events, ev-click does not
 * work for items inside a dialog because polymer moves the dialog's DOM around
 * This hook is a work-around for that issue.
 */
module.exports = function(handler) {
  return Object.create({
    hook: function(elem) {
      if (!elem.clickHandlerInstalled) {
        elem.addEventListener('click', handler);
        elem.clickHandlerInstalled = true;
      }
    }
  });
};