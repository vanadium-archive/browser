/*
 * smart-service provides an interface for machine learning.
 * Hooks to this service should make updates and ask for predictions.
 * A few basic learners are implemented as wrappers around the learning library.
 * TODO(alexfandrianto): All functions fail silently (with logging) at
 * the moment. Decide whether we want to throw errors or not.
 */

var addAttributes = require('../lib/addAttributes');
var store = require('../lib/store');
var log = require('../lib/log')('services:smart-service');
var constants = require('./smart-service-implementation');

// Export methods and constants
module.exports = {
  loadOrRegister: loadOrRegister,
  reset: reset,
  save: save,
  record: record,
  predict: predict,
  constants: constants
};

var learners = {};

/*
 * Given an id, type, and parameters, determine whether to load the learner or
 * to register a new one. The learner is added to the learners variable.
 * Fails when the id is taken, or the type is invalid.
 *
 * Returns a promise that performs this operation.
 */
function loadOrRegister(id, type, params) {
  log.debug('load or register', id, type, params);
  return load(id).then(function() {
    if (learners[id] === undefined) {
      register(id, type, params);
    }
  }).catch(function(err) {
    log.error('Unable to load or register', err);
    return Promise.reject(err);
  });
}

/*
 * Given an id, return a promise to delete from the store and in-memory buffer.
 */
function reset(id) {
  log.debug('reset', id);
  return store.removeValue(id).then(function() {
    if (learners[id] === undefined) {
      log.error('Cannot reset unused learner id', id);
      return;
    }
    delete learners[id];
  }).catch(function(err) {
    log.error('Failed to reset learner id:', id, err);
    return Promise.reject(err);
  });
}

/*
 * Given an id, return a promise that saves the learner to the store.
 */
function save(id) {
  if (learners[id] === undefined) {
    log.error('Cannot save unused learner id', id);
    return;
  }
  return store.setValue(id, learners[id]).catch(function(err) {
    log.error('Unable to save learner', err);
    return Promise.reject(err);
  });
}

/*
 * Given an id and input, update the referenced learner.
 */
function record(id, input) {
  if (learners[id] === undefined) {
    log.error('Cannot record to unused learner id', id);
    return;
  }
  learners[id].update(input);
}

/*
 * Given an id and input, return the referenced learner's prediction.
 */
function predict(id, input) {
  if (learners[id] === undefined) {
    log.error('Cannot predict with unused learner id', id);
    return;
  }
  return learners[id].predict(input);
}

/*
 * Helper function to register a new learner.
 */
function register(id, type, params) {
  log.debug('register', id, type, params);
  if (learners[id] !== undefined) {
    log.error('Cannot reuse learner id', id);
    return;
  }
  if (constants.LEARNER_MAP[type] === undefined) {
    log.error('Could not resolve learner type', type);
    return;
  }
  var Constructor = constants.LEARNER_MAP[type];
  var learner = new Constructor(type, params);
  learners[id] = learner;
}

/*
 * Helper function; returns a promise that loads a new learner from the store.
 */
function load(id) {
  log.debug('load', id);
  if (learners[id] !== undefined) {
    log.error('Cannot reuse learner id', id);
    return;
  }
  return store.getValue(id).then(function(learner) {
    if (learner === null) {
      log.debug('Learner was not present in the store.');
      return;
    }
    log.debug('Loaded Learner:', learner);
    addAttributes(learner, constants.LEARNER_METHODS[learner.type]);

    learners[id] = learner;
  }).catch(function(err) {
    log.error('Unable to load learner', err);
  });
}