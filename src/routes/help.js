var exists = require('../lib/exists');

module.exports = function(routes) {
  routes.addRoute('/help/:topic?', handleHelpRoute);
};

module.exports.createUrl = function(topic) {
  if (exists(topic)) {
    return '#/help/' + topic;
  }
  return '#/help';
};

function handleHelpRoute(state, events, params) {

  // Set the page to help
  state.navigation.pageKey.set('help');
  state.viewport.title.set('Help');

  // If given, go to the specified help page tab.
  if (params.topic) {
    // Import selectTab here to avoid a cyclical dependency.
    var selectTab = require('../components/help/selectTab');
    selectTab(state.help, events.help, params.topic);
  }
}