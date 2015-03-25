// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var sections = require('./constants').sections;

module.exports = selectTab;

/*
 * Exported function that sets the given state to the given tabKey.
 * If there is an error, however, the error event is run.
 */
function selectTab(state, events, tabKey) {
  // If the tab is invalid, go to the error page.
  if (sections.get(tabKey) === undefined) {
    //TODO(aghassemi) Needs to be 404 error when we have support for 404
    events.error(new Error('Invalid help page: ' + tabKey));
  } else {
    // Since the tabKey is valid, the selectedTab can be updated.
    state.selectedTab.set(tabKey);
  }
}