// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var store = require('../../lib/store');

var log = require('../../lib/log')('services:state:service');

var NAMESPACE_INDEX = 'index';

// TODO(alexfandrianto): Add save+load for sidePanelWidth and currentView.
// https://github.com/vanadium/browser/issues/74
module.exports = {
  saveNamespace: saveNamespace,
  loadNamespace: loadNamespace
};

function loadNamespace() {
  // TODO(aghassemi): Do we want to point to v.io by default?
  var index = '/ns.dev.v.io:8101';
  return store.getValue(NAMESPACE_INDEX).then(function(namespace) {
    return namespace || index;
  }).catch(function(err) {
    log.warn('Unable to access stored namespace index', err);
    return index;
  });
}

function saveNamespace(namespace) {
  return store.setValue(NAMESPACE_INDEX, namespace).catch(function(err) {
    log.warn('Unable to persist namespace index', namespace, err);
  });
}