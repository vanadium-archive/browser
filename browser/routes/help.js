module.exports = function(routes) {
  routes.addRoute('/help', handleHelpRoute);
};

function handleHelpRoute(state) {

  // Set the page to help
  state.navigation.pageKey.set('help');
}