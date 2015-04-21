// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var namespaceUtil = require('../../../../services/namespace/service').util;
var ItemCardList = require('../../item-card-list/index');

module.exports = create;
module.exports.render = render;

function create() {}

function render(viewsState, browseState, browseEvents, navEvents) {
  var isSearch = !!browseState.globQuery;
  var emptyText = (isSearch ? 'No glob search results' : 'No visible children');
  var title;
  if (isSearch) {
    title = 'Glob Search Results';
  } else {
    var mountedName = namespaceUtil.basename(browseState.namespace) || 'Home';
    title = mountedName;
  }

  return ItemCardList.render(
    viewsState.items,
    browseState,
    browseEvents,
    navEvents, {
      title: title,
      emptyText: emptyText,
      showShortName: true
    }
  );
}