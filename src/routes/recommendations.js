module.exports = function(routes) {
  routes.addRoute('/recommendation', handleRecommendationRoute);
  routes.addRoute('/recent', handleRecommendationRoute);
};

module.exports.createUrl = function() {
    return '#/recent';
};

function handleRecommendationRoute(state, events, params) {

  // Set the page to browse
  state.navigation.pageKey.set('browse');
  state.viewport.title.set('Browse');

  // Trigger browse components browseNamespace event
  events.browse.browseNamespace({
    'namespace': state.browse.namespace(),
    'subPage': 'recommendations',
    'viewType': state.browse.items.viewType()
  });
}