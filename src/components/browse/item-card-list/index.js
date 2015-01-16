var mercury = require('mercury');
var insertCss = require('insert-css');

var ItemCard = require('./item-card/index');

var css = require('./index.css');
var h = mercury.h;

module.exports.render = render;

/*
 * Renders a list of namespace items as cards in a list.
 * @param opts.title {string} Title for the list. e.g "Bookmarks"
 * @param opts.emptyText {string} Text to render when items is empty.
 *  e.g No Bookmarks found.
 * @param items {Array<namespaceitem>} @see services/namespace/item
 */
function render(items, browseState, browseEvents, navEvents, opts) {
  insertCss(css);

  var view;
  if (browseState.isFinishedLoadingItems && items.length === 0) {
    view = h('div.empty', h('span', opts.emptyText));
  } else {
    view = items.map(function(item) {
      return ItemCard.render(item, browseState, browseEvents, navEvents);
    });
  }

  var heading = h('h2', opts.title);

  return h('div.items-container', [heading, view]);
}