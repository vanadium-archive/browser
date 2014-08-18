module.exports = function(routes) {
  routes.addRoute('/error', handleErrorRoute);
};

module.exports.createUrl = function() {
  return '#/error';
};

function handleErrorRoute(state) {

  // Set the page to help
  state.navigation.pageKey.set('error');
  state.viewport.title.set('Error');
}