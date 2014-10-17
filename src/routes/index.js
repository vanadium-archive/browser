var browseRoute = require('./browse');
var log = require('../lib/log');
var store = require('../lib/store');

module.exports = function(routes) {
  routes.addRoute('/', handleIndexRoute);
};

function handleIndexRoute(state, events) {
  var index = '/proxy.envyor.com:8101';
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
