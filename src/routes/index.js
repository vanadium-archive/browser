var browseRoute = require('./browse');
var store = require('../lib/local-storage');

module.exports = function(routes) {
  routes.addRoute('/', handleIndexRoute);
};

function handleIndexRoute(state, events) {
  var index = '/proxy.envyor.com:8101';
  var storedIndex = store.getValue('index');
  if (storedIndex) {
    index = storedIndex;
  }

  // Redirect to browse
  events.navigation.navigate({
    path: browseRoute.createUrl(index)
  });
}
