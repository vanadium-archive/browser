var mercury = require('mercury');

var ItemCardList = require('../item-card-list/index');

var bookmarksService = require('../../../services/bookmarks/service');

var log = require('../../../lib/log')('components:browse:bookmarks');

module.exports = create;
module.exports.render = render;
module.exports.load = load;

/*
 * Bookmark view
 */
function create() {

  var state = mercury.varhash({
    /*
     * List of user-specified bookmark items to display
     * @see services/namespace/item
     * @type {Array<namespaceitem>}
     */
    bookmarkItems: mercury.array([])
  });

  return {
    state: state
  };
}

/*
 * Renders the bookmark view
 */
function render(state, browseState, browseEvents, navEvents) {
  return ItemCardList.render(
    state.bookmarkItems,
    browseState,
    browseEvents,
    navEvents, {
      title: 'Bookmarks',
      emptyText: 'No bookmarks.',
      showShortName: false,
      hoverActionInfo: {
        icon: 'clear',
        description: 'Remove bookmark',
        action: function(objectName) {
          browseEvents.selectedItemDetails.bookmark(
            {
              name: objectName,
              bookmark: false
            }
          );
        }
      }
    }
  );
}

/*
 * Does the initialization and loading of the data necessary to display the
 * bookmarks.
 * Called and used by the parent browse view to initialize the view on
 * request.
 * Returns a promise that will be resolved when loading is finished. Promise
 * is used by the parent browse view to display a loading progressbar.
 */
function load(state) {
  return new Promise(function(resolve, reject) {
    bookmarksService.getAll()
      .then(function bookmarksReceived(items) {
        state.put('bookmarkItems', items);
        items.events.once('end', resolve);
      }).catch(function(err) {
        log.error(err);
        reject();
      });
  });
}