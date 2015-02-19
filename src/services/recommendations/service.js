var mercury = require('mercury');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var arraySet = require('../../lib/arraySet');
var freeze = require('../../lib/mercury/freeze');
var sortedPush = require('../../lib/mercury/sorted-push-array');

var namespaceService = require('../namespace/service');
var smartService = require('../smart/service');

var log = require('../../lib/log')('services:recommendations:service');

var LEARNER_KEY = 'learner-shortcut';
var MAX_NUM_RECOMMENDATIONS = 10;

module.exports = {
  getAll: getAll,
  getRecommendationScore: getRecommendationScore,
  setRecommendationScore: setRecommendationScore
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
      var sorter = 'objectName';
      sortedPush(recommendationsObs, item, sorter);
    });
}

/*
 * Get the score of a particular recommended object name.
 */
function getRecommendationScore(name) {
  return smartService.predict(LEARNER_KEY, {
    name: name,
    penalize: false
  }).then(function(res) {
    var match = res.filter(function(rec) {
      return rec.item === name;
    })[0];
    return match ? match.score : 0;
  });
}

/*
 * Set the score of a particular object name.
 * Note: This will penalize (or boost) parents of the given name.
 */
function setRecommendationScore(name, newScore) {
  if (newScore > 0) {
    addNamespaceItem(name);
  } else {
    arraySet.set(recommendationsObs, null, false, indexOf.bind(null, name));
  }

  return getRecommendationScore(name).then(function(curScore) {
    var delta = newScore - curScore;
    return smartService.update(LEARNER_KEY, {
      name: name,
      weight: delta
    }).then(function() {
      return curScore;
    });
  }).catch(function(err) {
    log.error('Failed to set the recommendation score of', name, 'to', newScore,
      err);
  });
}

/*
 * Check the observe array for the index of the given item. -1 if not present.
 */
function indexOf(name) {
  return _.findIndex(recommendationsObs(), function(rec) {
    // Since recommendations can be assigned out of order, check for undefined.
    return rec !== undefined && name === rec.objectName;
  });
}