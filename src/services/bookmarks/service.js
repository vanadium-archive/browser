var mercury = require('mercury');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var arraySet = require('../../lib/arraySet');
var store = require('../../lib/store');
var freeze = require('../../lib/mercury/freeze');

var namespaceService = require('../namespace/service');

var log = require('../../lib/log')('services:bookmarks:service');

module.exports = {
  getAll: getAll,
  bookmark: bookmark,
  isBookmarked: isBookmarked
};

// Data is loaded from and saved to this key in the store.
var USER_BOOKMARKS_KEY = 'bookmarks-store-key';

// Singleton state for all the bookmarks.
var bookmarksObs = mercury.array([]);

/*
 * Gets all the namespace items that are bookmarked
 * As new bookmarks become available/removed the observable array will change
 * to reflect the changes.
 *
 * The observable result has an events property which is an EventEmitter
 * and emits 'end', 'itemError' events.
 *
 * @return {Promise.<mercury.array>} Promise of an observable array
 * of bookmark items
 */
function getAll() {
  // Empty out the array
  bookmarksObs.splice(0, bookmarksObs.getLength());
  var immutableBookmarksObs = freeze(bookmarksObs);
  immutableBookmarksObs.events = new EventEmitter();

  return loadKeys().then(getBookmarkItems);

  function getBookmarkItems(names) {
    var allItems = names.map(function(name) {
      return addNamespaceItem(name).catch(function(err) {
        immutableBookmarksObs.events.emit('itemError', {
          name: name,
          error: err
        });
        log.error('Failed to create item for "' + name + '"', err);
      });
    });

    Promise.all(allItems).then(function() {
      immutableBookmarksObs.events.emit('end');
    }).catch(function() {
      immutableBookmarksObs.events.emit('end');
    });

    return immutableBookmarksObs;
  }
}

/*
 * Gets the namespace items for a name and adds it to the observable array
 */
function addNamespaceItem(name) {
  return namespaceService.getNamespaceItem(name)
    .then(function(item) {
      bookmarksObs.push(item);
    });
}

/*
 * Whether a specific name is bookmarked or not
 * @return {Promise.<boolean>} Promise indicating a name is bookmarked
 */
function isBookmarked(name) {
  return loadKeys().then(function(keys) {
    return (keys && keys.indexOf(name) >= 0);
  });
}

/*
 * Bookmarks/Unbookmarks a name.
 * @return {Promise.<void>} Promise indicating whether operation succeeded.
 */
function bookmark(name, isBookmarked) {
  if (isBookmarked) {
    // new bookmark, add it to the state
    addNamespaceItem(name);
  } else {
    // remove bookmark
    arraySet.set(bookmarksObs, null, false, indexOf.bind(null, name));
  }

  // update store
  return loadKeys().then(function(keys) {
    keys = keys || []; // Initialize the bookmarks, if none were loaded.
    arraySet.set(keys, name, isBookmarked);
    return store.setValue(USER_BOOKMARKS_KEY, keys);
  });
}

/*
 * Check the observe array for the index of the given item. -1 if not present.
 */
function indexOf(name) {
  return _.findIndex(bookmarksObs(), function(bookmark) {
    // Since bookmarks can be assigned out of order, check for undefined.
    return bookmark !== undefined && name === bookmark.objectName;
  });
}

/*
 * Loads all the bookmarked names from the store
 */
function loadKeys() {
  return store.getValue(USER_BOOKMARKS_KEY).then(function(keys) {
    keys = keys || [];
    return keys.filter(function(key, index, self) {
      // only return unique and existing values
      return key !== null &&
        key !== undefined &&
        self.indexOf(key) === index;
    });
  });
}