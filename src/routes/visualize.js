module.exports = function(routes) {
  routes.addRoute('/visualize', handleVisualizeRoute);
};

module.exports.createUrl = function() {
  return '#/visualize';
};

function handleVisualizeRoute(state) {

  // Set the page to visualize
  state.navigation.pageKey.set('visualize');
  state.viewport.title.set('Visualize');
}