// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var bookmarksService = require('../../../services/bookmarks/service');

var log = require('../../../lib/log')(
  'components:browse:item-details:bookmark');

module.exports = bookmark;

function bookmark(state, events, data) {
  var wasBookmarked = state.isBookmarked();

  // If this is the current item, set the bookmark flag.
  if (state.itemName() === data.name) {
    state.isBookmarked.set(data.bookmark);
  }

  bookmarksService.bookmark(data.name, data.bookmark).then(function() {
    var toastText = 'Bookmark ' +
      (data.bookmark ? 'added' : 'removed') +
      ' for ' + data.name;

    var undoAction = bookmark.bind(null, state, events, {
      name: data.name,
      bookmark: !data.bookmark
    });


    events.toast({
      text: toastText,
      action: undoAction,
      actionText: 'UNDO'
    });
  }).catch(function(err) {
    var errText = 'Failed to ' +
      (data.bookmark ? 'add ' : 'remove') +
      'bookmark for ' + data.name;

    log.error(errText, err);

    // If the name is selected on error, reset state back to what it used to be.
    if (state.itemName() === data.name) {
      state.isBookmarked.set(wasBookmarked);
    }
    events.toast({
      text: errText,
      type: 'error'
    });
  });
}