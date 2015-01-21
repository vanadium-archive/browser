var mercury = require('mercury');
var ItemCardList = require('../item-card-list/index');

var recommendationsService =
  require('../../../services/recommendations/service');

var log = require('../../../lib/log')('components:browse:recommendation');

module.exports = create;
module.exports.render = render;
module.exports.load = load;

/*
 * Recommendation view
 */
function create() {

  var state = mercury.varhash({
    /*
     * List of recommended shortcuts to display
     * @see services/namespace/item
     * @type {Array<namespaceitem>}
     */
    recShortcuts: mercury.array([]),

  });

  return {
    state: state
  };
}

function render(state, browseState, browseEvents, navEvents) {
  return ItemCardList.render(
    state.recShortcuts,
    browseState,
    browseEvents,
    navEvents, {
      title: 'Recommendations',
      emptyText: 'No recommendations',
      showShortName: false
    }
  );
}

/*
 * Does the initialization and loading of the data necessary to display the
 * recommendations.
 * Called and used by the parent browse view to initialize the view on
 * request.
 * Returns a promise that will be resolved when loading is finished. Promise
 * is used by the parent browse view to display a loading progressbar.
 */
function load(state) {
  return new Promise(function(resolve, reject) {
    recommendationsService.getAll()
      .then(function recReceived(items) {
        state.put('recShortcuts', items);
        items.events.on('end', resolve);
      }).catch(function(err) {
        log.error(err);
        reject();
      });
  });
}