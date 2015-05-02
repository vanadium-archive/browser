// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var addAttributes = require('../../../src/lib/add-attributes');
var store = require('../../../src/lib/store');
var proxyquire = require('proxyquireify')(require);

// Mock of the smart service implementation file. Uses a single dumbLearner.
var smartServiceImplementationMock = {
  LEARNER_DUMB: 0,
  LEARNER_MAP: {
    0: dumbLearner
  },
  LEARNER_METHODS: {
    0: {
      update: dumbLearnerUpdate,
      predict: dumbLearnerPredict
    }
  }
};

// The dumbLearner simply counts the calls to update and predict.
function dumbLearner(type, params) {
  this.type = type;
  this.params = params;
  this.recordCount = 0;
  this.predictCount = 0;
  addAttributes(this, smartServiceImplementationMock.LEARNER_METHODS[type]);
}
function dumbLearnerUpdate(input) {
  this.recordCount++;
}
function dumbLearnerPredict(input) {
  this.predictCount++;
  return [this.recordCount, this.predictCount];
}

var smartService = proxyquire(
  '../../../src/services/smart/service', {
  './service-implementation': smartServiceImplementationMock
});

function makeLearner(id) {
  return smartService.loadOrCreate(
    id,
    smartService.constants.LEARNER_DUMB,
    { learningRate: 0.1, regularize: false }
  );
}

test('update and predict', function(t) {
  var id1 = 'first';
  var id2 = 'second';

  // First, ensure that these learners aren't in the store.
  store.removeValue(id1).then(function() {
    return store.removeValue(id2);
  }).then(function() {
    // Then, create learners using makeLearner.
    return makeLearner(id1);
  }).then(function() {
    return makeLearner(id2);
  }).then(function() {
    // The # of predictions increases as we call predict on learner 1.
    return smartService.predict(id1, 'some input');
  }).then(function(value) {
    t.deepEqual(value, [0, 1], 'learner 1 => predict called 1 time');
    return smartService.predict(id1, 'some input');
  }).then(function(value) {
    t.deepEqual(value, [0, 2], 'learner 1 => predict called 2 times');

    // The # of predictions increases as we call predict on learner 2.
    return smartService.predict(id2, 'some input');
  }).then(function(value) {
    t.deepEqual(value, [0, 1], 'learner 2 => predict called 1 time');

    // The # of updates rises when calling update on learner 1.
    return smartService.update(id1, 'some input');
  }).then(function() {
    return smartService.predict(id1, 'some input');
  }).then(function(value) {
    t.deepEqual(value, [1, 3], 'learner 1 => record x1, predict x3');

    // The # of updates rises when calling update on learner 2.
    return smartService.update(id2, 'some input');
  }).then(function() {
    return smartService.update(id2, 'some input');
  }).then(function() {
    return smartService.predict(id2, 'some input');
  }).then(function(value) {
    t.deepEqual(value, [2, 2], 'learner 2 => record x2, predict x2');

    t.end();
  }).catch(t.end);
});

test('save, load, and reset', function(t) {
  var id1 = 'third';
  var id2 = 'fourth';

  // The store does not have these values initially.
  store.getValue(id1).then(function(value) {
    t.equal(value, null, 'learner 1 does not start in the store');

    return store.getValue(id2);
  }).then(function(value) {
    t.equal(value, null, 'learner 2 does not start in the store');

    // Make learner 1 through registration.
    return makeLearner(id1);
  }).then(function() {
    return smartService.save(id1);
  }).then(function() {
    return store.getValue(id1);
  }).then(function(value) {
    t.notEqual(value, null, 'saving learner 1 puts it in the store');

    // Copy this value into the store at learner 2's location.
    return store.setValue(id2, value);
  }).then(function(value) {
    // Then load this copy, learner 2.
    return smartService.loadOrCreate(id2);
  }).then(function(learner2) {
    // We can call predict and update on id2 (a loaded learner).
    // Note: predict and update are required functions on any learner object.
    t.doesNotThrow(
      function() { learner2.update('some input'); },
      'loaded learners can update'
    );
    t.doesNotThrow(
      function() { learner2.predict('some other input'); },
      'loaded learners can predict'
    );

    // Additionally, the dumb learner's counts match what they ought to be.
    t.deepEqual(learner2.predict('random input'), [1, 2],
      'learner 2 => record x1, predict x2');

    return smartService.reset(id1); // Reset id1 but not id2.
  }).then(function() {
    return store.getValue(id1);
  }).then(function(value) {
    t.equal(value, null, 'learner 1 is not in the store after reset');

    return store.getValue(id2);
  }).then(function(value) {
    t.notEqual(value, null, 'learner 2 remains in the store (not reset)');

    return smartService.reset(id2); // Now reset id2 and its value becomes null.
  }).then(function() {
    return store.getValue(id2);
  }).then(function(value) {
    t.equal(value, null, 'learner 2 is not in the store after reset');
    t.end();
  }).catch(function(err) {
    // Cleanup, just in case.
    return Promise.all([
      store.removeValue(id1),
      store.removeValue(id2)
    ]).then(function() {
      t.end(err);
    }).catch(t.end);
  });
});

test('rejects on bad loadOrCreate', function(t) {
  var id = 'multiload';
  smartService.loadOrCreate(id, null, {}).then(function success(learner) {
    t.fail('Should not succeed with bad learner type');
  }, function failure(err) {
    t.ok(err, 'Bad learner type => loadOrCreate rejected');
  }).then(function() {
    return smartService.loadOrCreate(id, 0, {}); // first loadOrCreate
  }).then(function() {
    return smartService.loadOrCreate(id, 0, {}); // second loadOrCreate
  }).then(function success(learner) {
    t.end('Should not return a learner if already created/loaded');
  }, function failure(err) {
    t.ok(err, 'Already used learner id => loadOrCreate rejected');
    t.end();
  }).catch(t.end);
});

test('rejects on bad save', function(t) {
  smartService.save('this id not here').then(function success() {
    t.end('Should not save an unregistered learner');
  }, function failure(err) {
    t.ok(err, 'Unregistered learner => save rejected');
    t.end();
  }).catch(t.end);
});

test('rejects on bad reset', function(t) {
  smartService.reset('this id not here').then(function success() {
    t.end('Should not reset an unregistered learner');
  }, function failure(err) {
    t.ok(err, 'Unregistered learner => reset rejected');
    t.end();
  }).catch(t.end);
});