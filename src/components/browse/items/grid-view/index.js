var namespaceUtil = require('../../../../services/namespace/service').util;
var ItemCardList = require('../../item-card-list/index');

module.exports = create;
module.exports.render = render;

function create() {}

function render(itemsState, browseState, browseEvents, navEvents) {
  var isSearch = !!browseState.globQuery;
  var emptyText = (isSearch ? 'No glob search results' : 'No children');
  var title;
  if (isSearch) {
    title = 'Glob Search Results';
  } else {
    var mountedName = namespaceUtil.basename(browseState.namespace) || 'Home';
    title = mountedName;
  }

  return ItemCardList.render(
    itemsState.items,
    browseState,
    browseEvents,
    navEvents, {
      title: title,
      emptyText: emptyText,
      showShortName: true
    }
  );
}