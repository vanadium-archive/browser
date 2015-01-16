var mercury = require('mercury');
var EventEmitter = require('events').EventEmitter;

var freeze = require('../../lib/mercury/freeze');

var namespaceService = require('../namespace/service');
var smartService = require('../smart/service');

var log = require('../../lib/log')('services:recommendations:service');

var LEARNER_KEY = 'learner-shortcut';
var MAX_NUM_RECOMMENDATIONS = 10;

module.exports = {
  getAll: getAll
};

// Singleton state for all the bookmarks.
var recommendationsObs = mercury.array([]);

smartService.loadOrCreate(
  LEARNER_KEY,
  smartService.constants.LEARNER_SHORTCUT, {
    k: MAX_NUM_RECOMMENDATIONS
  }
).catch(function(err) {
  log.error(err);
});

/*
 * Gets all the namespace items that are recommended based on our learning agent
 * As new recommendations become available/removed the observable array will
 * change to reflect the changes.
 *
 * The observable result has an events property which is an EventEmitter
 * and emits 'end', 'itemError' events.
 *
 * @return {Promise.<mercury.array>} Promise of an observable array
 * of recommended items
 */
function getAll() {

  // Empty out the array
  recommendationsObs.splice(0, recommendationsObs.getLength());
  var immutableRecommendationsObs = freeze(recommendationsObs);
  immutableRecommendationsObs.events = new EventEmitter();

  return smartService.predict(LEARNER_KEY).then(getRecommendationItems);

  function getRecommendationItems(recs) {
    var allItems = recs.map(function(rec) {
      var name = rec.item;
      return addNamespaceItem(name).catch(function(err) {
        immutableRecommendationsObs.events.emit('itemError', {
          name: name,
          error: err
        });
        log.error('Failed to create item for "' + name + '"', err);
      });
    });

    Promise.all(allItems).then(function() {
      immutableRecommendationsObs.events.emit('end');
    }).catch(function() {
      immutableRecommendationsObs.events.emit('end');
    });

    return immutableRecommendationsObs;
  }
}

/*
 * Gets the namespace items for a name and adds it to the observable array
 */
function addNamespaceItem(name) {
  return namespaceService.getNamespaceItem(name)
    .then(function(item) {
      recommendationsObs.push(item);
    });
}