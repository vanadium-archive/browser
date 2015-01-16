var ItemCardList = require('../../item-card-list/index');

module.exports = create;
module.exports.render = render;

function create() {}

function render(itemsState, browseState, browseEvents, navEvents) {
  var isSearch = !!browseState.globQuery;
  var emptyText = (isSearch ? 'No glob search results' : 'No children');
  var title = (isSearch ? 'Glob Search Results' : 'Grid View');

  return ItemCardList.render(
    itemsState.items,
    browseState,
    browseEvents,
    navEvents, {
      title: title,
      emptyText: emptyText
    }
  );
}