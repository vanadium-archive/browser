// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

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
    recShortcuts: mercury.array([])
  });

  return {
    state: state
  };
}

function render(state, browseState, browseEvents, navEvents) {
  // An event used to reduce a recommendation score to 0, or to recover it.
  var modifyRecommendation = function(score, objectName) {
    recommendationsService.setRecommendationScore(objectName, score).then(
      function(oldScore) {
        var desc = (oldScore === 0 ? 'Restored ' : 'Forgot ');
        browseEvents.toast({
          text: desc + ' recent item ' + objectName,
          action: modifyRecommendation.bind(null, oldScore, objectName),
          actionText: 'UNDO'
        });
      }
    ).catch(function(err) {
      var errText = 'Failed to forget recent item ' + objectName;
      log.error(errText, err);
      browseEvents.toast({
        text: errText,
        type: 'error'
      });
    });
  };

  return ItemCardList.render(
    state.recShortcuts,
    browseState,
    browseEvents,
    navEvents, {
      title: 'Recent',
      emptyText: 'No recently accessed items.',
      showShortName: false,
      hoverActionInfo: {
        icon: 'clear',
        description: 'Forget recent item',
        action: modifyRecommendation.bind(null, 0)
      }
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
        items.events.once('end', resolve);
      }).catch(function(err) {
        log.error(err);
        reject();
      });
  });
}