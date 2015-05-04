// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var urlUtil = require('url');
var qsUtil = require('querystring');

var exists = require('../lib/exists');
var stateService = require('../services/state/service');

module.exports = function(routes) {
  // Url pattern: /browse/vanadiumNameSpace?glob=*&viewType=grid
  routes.addRoute('/browse/:namespace?', handleBrowseRoute);
};

module.exports.createUrl = function(browseState, opts) {
  var globQuery;
  var viewType;
  var namespace;
  if (opts) {
    globQuery = opts.globQuery;
    viewType = opts.viewType;
    namespace = opts.namespace;
  }

  // We preserve namespace and viewtype if they are not provided
  // We reset globquery unless provided
  namespace = (namespace === undefined ? browseState.namespace : namespace);
  viewType = (viewType === undefined ? browseState.views.viewType : viewType);

  var path = '/browse';
  if (exists(namespace)) {
    namespace = encodeURIComponent(namespace);
    path += '/' + namespace;
  }
  var query = {};
  if (exists(globQuery)) {
    query['glob'] = globQuery;
  }
  if (exists(viewType)) {
    query['viewtype'] = viewType;
  }
  return '#' + urlUtil.format({
    pathname: path,
    query: query
  });
};

function handleBrowseRoute(state, events, params) {

  // Set the page to browse
  state.navigation.pageKey.set('browse');
  state.viewport.title.set('Browse');

  var namespace;
  var globquery;
  var viewtype;
  if (params.namespace) {
    var parsed = urlUtil.parse(params.namespace);
    if (parsed.pathname) {
      namespace = parsed.pathname;
    }

    if (parsed.query) {
      var queryString = qsUtil.parse(parsed.query);
      globquery = queryString.glob;
      viewtype = queryString.viewtype;
    }
  }

  // Persist this namespace so that we know where to reload next time.
  if (!state.demo()) {
    stateService.saveNamespace(namespace);
  }

  // Trigger browse components browseNamespace event
  events.browse.browseNamespace({
    'namespace': namespace,
    'globQuery': globquery,
    'viewType': viewtype,
    'subPage': 'views'
  });
}