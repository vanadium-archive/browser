// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var store = require('../../lib/store');

var log = require('../../lib/log')('services:state:service');

var NAMESPACE_INDEX = 'index';
var SIDE_PANEL_WIDTH = 'sidePanelWidth';
var BROWSE_VIEW_TYPE = 'browseViewType';

module.exports = {
  saveNamespace: saveNamespace,
  loadNamespace: loadNamespace,
  saveSidePanelWidth: saveSidePanelWidth,
  loadSidePanelWidth: loadSidePanelWidth,
  saveBrowseViewType: saveBrowseViewType,
  loadBrowseViewType: loadBrowseViewType
};

// Save the namespace index to the store.
function saveNamespace(namespace) {
  return store.setValue(NAMESPACE_INDEX, namespace).catch(function(err) {
    log.warn('Unable to persist namespace index', namespace, err);
  });
}

// Load the namespace index from the store.
// On any failure, use the default value instead.
function loadNamespace() {
  // TODO(aghassemi): Do we want to point to v.io by default?
  var defaultIndex = '/ns.dev.v.io:8101';
  return store.getValue(NAMESPACE_INDEX).then(function(namespace) {
    return namespace !== null ? namespace : defaultIndex;
  }).catch(function(err) {
    log.warn('Unable to access stored namespace index', err);
    return defaultIndex;
  });
}

// Save the side panel width to the store.
function saveSidePanelWidth(width) {
  return store.setValue(SIDE_PANEL_WIDTH, width
  ).catch(function(err) {
    log.error(err);
  });
}

// Load the side panel width from the store.
// On any failure, use the default value instead.
function loadSidePanelWidth() {
  var defaultWidth = '50%';
  return store.getValue(SIDE_PANEL_WIDTH).then(function(width) {
    return width !== null ? width : defaultWidth;
  }).catch(function(err) {
    log.warn('Unable to access stored side panel width', err);
    return defaultWidth;
  });
}

// Save the browse view type to the store.
function saveBrowseViewType(view) {
  return store.setValue(BROWSE_VIEW_TYPE, view
  ).catch(function(err) {
    log.error(err);
  });
}

// Load the browse view type from the store.
// On any failure, use the default value instead.
function loadBrowseViewType() {
  var defaultView = 'tree';
  return store.getValue(BROWSE_VIEW_TYPE).then(function(view) {
    return view !== null ? view : defaultView;
  }).catch(function(err) {
    log.warn('Unable to access stored browse view', err);
    return defaultView;
  });
}
