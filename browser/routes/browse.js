module.exports = function(routes) {
  routes.addRoute('/browse/:namespace?/:globquery?', handleBrowseRoute);
};

function handleBrowseRoute(state, events, params) {

  // Set the page to browse
  state.navigation.pageKey.set('browse');

  // Trigger browse components browseNamespace event
  events.browse.browseNamespace({
    'namespace': params.namespace,
    'globQuery': params.globquery
  });
}