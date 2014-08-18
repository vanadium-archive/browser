module.exports = function(routes) {
  routes.addRoute('/help', handleHelpRoute);
};

module.exports.createUrl = function() {
  return '#/help';
};

function handleHelpRoute(state) {

  // Set the page to help
  state.navigation.pageKey.set('help');
  state.viewport.title.set('Help');
}