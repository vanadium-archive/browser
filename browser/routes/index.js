module.exports = function(routes) {
  routes.addRoute('/', handleIndexRoute);
};

function handleIndexRoute(state, events) {

  // Redirect to browse
  events.navigation.navigate({
    path: '/browse'
  });
}