/*
 * smart-service provides an interface for machine learning.
 * Hooks to this service should make updates and ask for predictions.
 * A few basic learners are implemented as wrappers around the learning library.
 * TODO(alexfandrianto): All functions fail silently (with just console) at
 * the moment. Decide whether we want to throw errors or not.
 */

var addAttributes = require('../lib/addAttributes');
var store = require('../lib/local-storage');
var debug = require('debug')('smart-service');
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
 */
function loadOrRegister(id, type, params) {
  debug('load or register', id, type, params);
  load(id);
  if (learners[id] === undefined) {
    register(id, type, params);
  }
}

/*
 * Given an id, delete it from the local store and in-memory buffer.
 */
function reset(id) {
  debug('reset', id);
  store.removeValue(id);
  if (learners[id] === undefined) {
    console.error('Cannot reset unused learner id', id);
    return;
  }
  delete learners[id];
}

/*
 * Given an id, save the learner to local-storage.
 */
function save(id) {
  if (learners[id] === undefined) {
    console.error('Cannot save unused learner id', id);
    return;
  }
  store.setValue(id, learners[id]);
}

/*
 * Given an id and input, update the referenced learner.
 */
function record(id, input) {
  if (learners[id] === undefined) {
    console.error('Cannot record to unused learner id', id);
    return;
  }
  learners[id].update(input);
}

/*
 * Given an id and input, return the referenced learner's prediction.
 */
function predict(id, input) {
  if (learners[id] === undefined) {
    console.error('Cannot predict with unused learner id', id);
    return;
  }
  return learners[id].predict(input);
}

/*
 * Helper function to register a new learner.
 */
function register(id, type, params) {
  debug('register', id, type, params);
  if (learners[id] !== undefined) {
    console.error('Cannot reuse learner id', id);
    return;
  }
  if (constants.LEARNER_MAP[type] === undefined) {
    console.error('Could not resolve learner type', type);
    return;
  }
  var Constructor = constants.LEARNER_MAP[type];
  var learner = new Constructor(type, params);
  learners[id] = learner;
}

/*
 * Helper function to load a new learner from local-storage.
 */
function load(id) {
  debug('load', id);
  if (learners[id] !== undefined) {
    console.error('Cannot reuse learner id', id);
    return;
  }
  var learner = store.getValue(id);
  if (learner === null) {
    debug('Learner was not present in the store.');
    return;
  }
  debug('Loaded Learner:', learner);
  addAttributes(learner, constants.LEARNER_METHODS[learner.type]);

  learners[id] = learner;
}