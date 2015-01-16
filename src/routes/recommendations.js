module.exports = function(routes) {
  routes.addRoute('/recommendation', handleRecommendationRoute);
};

module.exports.createUrl = function() {
    return '#/recommendation';
};

function handleRecommendationRoute(state, events, params) {

  // Set the page to browse
  state.navigation.pageKey.set('browse');
  state.viewport.title.set('Browse');

  // Trigger browse components browseNamespace event
  events.browse.browseNamespace({
    'namespace': state.browse.namespace(),
    'subPage': 'recommendations'
  });
}