var mercury = require('mercury');
var urlUtil = require('url');
var qsUtil = require('querystring');
var exists = require('../lib/exists');
var store = require('../lib/local-storage');
var smartService = require('../services/smart-service');
var browseService = require('../services/browse-service');
var setMercuryArray = require('../lib/mercury/setMercuryArray');

module.exports = function(routes) {
  // Url pattern: /browse/veyronNameSpace?glob=*
  routes.addRoute('/browse/:namespace?', handleBrowseRoute);
};

module.exports.createUrl = function(namespace, globquery) {
  var path = '/browse';
  if (exists(namespace)) {
    namespace = encodeURIComponent(namespace);
    path += '/' + namespace;
  }
  var query;
  if (exists(globquery)) {
    query = {
      'glob': globquery
    };
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

  var namespace = '';
  var globquery = '';
  if (params.namespace) {
    var parsed = urlUtil.parse(params.namespace);
    namespace = parsed.pathname || '';
    if (parsed.query) {
      globquery = qsUtil.parse(parsed.query).glob;
    }
  }

  // Put the URL in the store, so we know where to reload next time.
  store.setValue('index', namespace);

  // Update our shortcuts with these predictions.
  var predictions = smartService.predict('learner-shortcut', '');
  var shortcuts = predictions.map(function(prediction) {
    var shortcut = mercury.struct({
      itemName: mercury.value(prediction.item),
      isGlobbable: mercury.value(false)
    });
    // If it turns out that the shortcut is globbable, it will be updated.
    browseService.isGlobbable(shortcut.itemName()).then(function(isGlobbable) {
      shortcut.isGlobbable.set(isGlobbable);
    });
    return shortcut;
  });
  setMercuryArray(state.browse.shortcuts, shortcuts);

  // Trigger browse components browseNamespace event
  events.browse.browseNamespace({
    'namespace': namespace,
    'globQuery': globquery
  });
}