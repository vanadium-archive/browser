module.exports = function(routes) {
  routes.addRoute('/bookmarks', handleBookmarksRoute);
};

module.exports.createUrl = function() {
    return '#/bookmarks';
};

function handleBookmarksRoute(state, events, params) {

  // Set the page to browse
  state.navigation.pageKey.set('browse');
  state.viewport.title.set('Browse');

  // Trigger browse components browseNamespace event
  events.browse.browseNamespace({
    'namespace': state.browse.namespace(),
    'subPage': 'bookmarks'
  });
}