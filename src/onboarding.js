// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var bookmarkService = require('./services/bookmarks/service');

var store = require('./lib/store');
var log = require('./lib/log')('onboarding');

module.exports = onboarding;

// When a new user visits the namespace browser, do a simple onboarding.
function onboarding(rt, appState) {
  store.getValue('returning_user').then(function(returning) {
    if (!returning) {
      log.debug('Welcome to the Vanadium Namespace Browser!');
      addDefaultBookmarks(rt);

      // TODO(alexfandrianto): We can improve the onboarding experience
      // By changing the appState variable, we can do other things to help a new
      // user learn the Namespace Browser.
      completeOnboarding();
    }
  }).catch(function(err) {
    log.error('Failed to get "returning_user" flag', err);
  });
}

// Add default bookmarks to the user's store.
function addDefaultBookmarks(rt) {
  function bookmarkFail(err) {
    log.warn('Could not add default bookmark', err);
  }

  var email = getEmailFromAccountName(rt.accountName);

  // Determine the default bookmarks.
  var globalMT = '/ns.dev.v.io:8101';
  var personal;
  if (email) {
    // Point to their personal section of the global namespace.
    personal = globalMT + '/users/' + email;
  }

  // If the bookmark already exists, then Mercury's observ-array will add it a
  // 2nd time, so check if it's already bookmarked.
  // Avoid racing bookmarks. Make sure to add them consecutively to the store.
  bookmarkService.isBookmarked(globalMT).then(function(isGlobalMT) {
    if (!isGlobalMT) {
      bookmarkService.bookmark(globalMT, true);
    }
  }).catch(bookmarkFail).then(function() {
    // Add a personal bookmark if present.
    if (personal) {
      bookmarkService.isBookmarked(personal).then(function(isPersonal) {
        if (!isPersonal) {
          bookmarkService.bookmark(personal, true);
        }
      });
    }
  }).catch(bookmarkFail);
}

function getEmailFromAccountName(accountName) {
  // Use a regular expression to extract the email.
  return /dev.v.io\/root\/users\/(.*?)\//.exec(accountName)[1];
}

// Set the returning_user flag to true.
function completeOnboarding() {
  store.setValue('returning_user', true).catch(function(err) {
    log.error('Failed to set "returning_user" flag', err);
  });
}