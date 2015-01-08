var browseRoute = require('./browse');
var log = require('../lib/log');
var store = require('../lib/store');

module.exports = function(routes) {
  routes.addRoute('/', handleIndexRoute);
};

function handleIndexRoute(state, events) {
  // TODO(aghassemi) What's the prod address?, do we even want to point to
  // v.io by default?
  var index = '/ns.dev.v.io:8101';
  store.getValue('index').then(function(storedIndex) {
    if (storedIndex) {
      index = storedIndex;
    }

    // Redirect to browse
    events.navigation.navigate({
      path: browseRoute.createUrl(index)
    });
  }).catch(function(err) {
    log.warn('Unable to access stored index', err);

    // Redirect to browse
    events.navigation.navigate({
      path: browseRoute.createUrl(index)
    });
  });
}
