var urlUtil = require('url');
var qsUtil = require('querystring');
var exists = require('../lib/exists');
var store = require('../lib/local-storage');
var smartService = require('../services/smart-service');

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

  // Log the URLs as we receive them.
  store.setValue('index', namespace);

  // Log the URLs to the smart service.
  smartService.record('learner-shortcut', {name: namespace});

  // TODO(alexfandrianto): Remove these debug lines.
  // For debug, display what our prediction would be.
  console.log('PredictS:', smartService.predict('learner-shortcut', ''));

  // Update our shortcuts with these predictions.
  var predictions = smartService.predict('learner-shortcut', '');
  // TODO(alexfandrianto): When observ-array's set() method works properly,
  // update the observ-array variables to use set instead of splice + push.
  state.browse.shortcuts.splice(0, state.browse.shortcuts.getLength());
  predictions.map(function(prediction) {
    state.browse.shortcuts.push(prediction.item);
  });

  // Save every time we navigate to a page.
  smartService.save('learner-shortcut');

  // Trigger browse components browseNamespace event
  events.browse.browseNamespace({
    'namespace': namespace,
    'globQuery': globquery
  });
}