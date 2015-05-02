// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
 * smart-service provides an asynchronous interface for machine learning.
 * Hooks to this service should make updates and ask for predictions.
 * A few basic learners are implemented as wrappers around the learning library.
 */

var addAttributes = require('../../lib/add-attributes');
var store = require('../../lib/store');
var log = require('../../lib/log')('services:smart-service');
var constants = require('./service-implementation');
var extendDefaults = require('../../lib/extend-defaults');

// Export methods and constants
module.exports = {
  loadOrCreate: loadOrCreate,
  reset: reset,
  save: save,
  update: update,
  predict: predict,
  constants: constants
};

// This caches the learners loaded into memory.
var learners = {};

/*
 * Given an id, type, and parameters, return a promise that attempts to load the
 * learner from the store, and failing that, creates a new one.
 *
 * Registers and resolves the learner upon success.
 * Rejects when the id is taken, or the type is invalid.
 */
function loadOrCreate(id, type, params) {
  log.debug('load or create', id, type, params);

  if (learners[id] !== undefined) {
    return Promise.reject('Cannot reuse learner id ' + id);
  }

  // Store the learner right away. Calls to get should use this promise.
  learners[id] = load(id).then(function loadSuccess(learner) {
    log.debug('loaded learner', id);
    learner.params = extendDefaults(learner.params, params);
    return Promise.resolve(learner);
  }, function loadFailure() {
    return create(id, type, params).then(function(learner) {
      log.debug('created learner', id);
      return Promise.resolve(learner);
    });
  }).catch(function(err) {
    log.error('Unable to load or create', id, err);
    return Promise.reject(err);
  });

  return learners[id];
}

/*
 * Return a promise containing the learner at the given id. The promise rejects
 * if that learner has not been registered yet.
 */
function get(id) {
  if (learners[id] === undefined) {
    return Promise.reject('Unused learner id ' + id);
  }
  return learners[id];
}

/*
 * Return a promise to delete from the store and in-memory buffer.
 */
function reset(id) {
  log.debug('reset', id);
  return store.removeValue(id).then(function() {
    if (learners[id] === undefined) {
      return Promise.reject('Cannot reset unused learner id ' + id);
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
    return Promise.reject('Cannot save unused learner id ' + id);
  }
  return learners[id].then(function(learner) {
    return store.setValue(id, learner);
  }).catch(function(err) {
    log.error('Unable to save learner', err);
    return Promise.reject(err);
  });
}

/*
 * Given an id and input, return a promise to update the corresponding learner
 * with that input and save to the store.
 */
function update(id, input) {
  return get(id).then(function(learner) {
    learner.update(input);

    return save(id);
  });
}

/*
 * Given an id and input, return a promise that uses the corresponding learner
 * to make a prediction on the input.
 */
function predict(id, input) {
  return get(id).then(function(learner) {
    return learner.predict(input);
  });
}

/*
 * Helper function; returns a promise to create a new learner.
 */
function create(id, type, params) {
  log.debug('create', id, type, params);
  if (constants.LEARNER_MAP[type] === undefined) {
    return Promise.reject('Could not resolve learner type ' + type);
  } else {
    var LearnerConstructor = constants.LEARNER_MAP[type];
    var learner = new LearnerConstructor(type, params);
    return Promise.resolve(learner);
  }
}

/*
 * Helper function; returns a promise that loads a new learner from the store.
 * Rejects if the value is null.
 */
function load(id) {
  log.debug('load', id);
  return store.getValue(id).then(function(learner) {
    if (learner === null) {
      return Promise.reject('Learner ' + id + ' was not present in the store.');
    } else {
      log.debug('Loaded Learner:', learner);

      // Attach the learner's functions, then resolve.
      addAttributes(learner, constants.LEARNER_METHODS[learner.type]);
      return Promise.resolve(learner);
    }
  });
}