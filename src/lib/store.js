// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
 * The store allows key-value store for string keys and any value.
 */
var localForage = require('localforage');
var stripFunctions = require('./stripFunctions');
var _ = require('lodash');

module.exports = {
  hasValue: hasValue,
  setValue: setValue,
  getValue: getValue,
  removeValue: removeValue,
  getKeysWithPrefix: getKeysWithPrefix
};

/*
 * Given a string identifier, return a promise indicating if the key exists.
 */
function hasValue(key) {
  return localForage.getItem(key).then(function(value) {
    return value !== null;
  });
}

/*
 * Given a string identifier and any value, strip functions out of the value
 * and put it into the store. Returns a promise.
 */
function setValue(key, value) {
  return localForage.setItem(key, stripFunctions(value));
}

/*
 * Given a string identifier, return a promise with the return value.
 */
function getValue(key) {
  return localForage.getItem(key);
}

/*
 * Given a string identifier, return a promise that removes the value.
 */
function removeValue(key) {
  return localForage.removeItem(key);
}

/*
 * Given a string prefix, return a promise with the corresponding keys.
 * TODO(alexfandrianto): May be inefficient depending on backend. Avoid using.
 * Upgrade to glob once the store is ready.
 */
function getKeysWithPrefix(key) {
  return localForage.keys().then(function(keys) {
    return _.filter(keys, function(candidate) {
      return candidate.indexOf(key) === 0;
    });
  });
}