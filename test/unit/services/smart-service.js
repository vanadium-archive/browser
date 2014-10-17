var test = require('prova');
var addAttributes = require('../../../src/lib/addAttributes');
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
  '../../../src/services/smart-service', {
  './smart-service-implementation': smartServiceImplementationMock
});

function makeLearner(id) {
  return smartService.loadOrRegister(
    id,
    smartService.constants.LEARNER_DUMB,
    { learningRate: 0.1, regularize: false }
  );
}

test('record and predict', function(t) {
  var id1 = 'first';
  var id2 = 'second';
  makeLearner(id1).then(function() {
    return makeLearner(id2);
  }).then(function() {
    // The # of predictions increases as we call predict.
    t.deepEqual(smartService.predict(id1, 'some input'), [0, 1],
      'learner 1 => predict called 1 time');
    t.deepEqual(smartService.predict(id1, 'some input'), [0, 2],
      'learner 1 => predict called 2 times');
    t.deepEqual(smartService.predict(id2, 'some input'), [0, 1],
      'learner 2 => predict called 1 time');

    // If we record, then the relevant learner is also called.
    smartService.record(id1, 'some input');
    smartService.record(id2, 'some input');
    smartService.record(id2, 'some input');
    t.deepEqual(smartService.predict(id1, 'some input'), [1, 3],
      'learner 1 => record x1, predict x2');
    t.deepEqual(smartService.predict(id2, 'some input'), [2, 2],
      'learner 2 => record x2, predict x2');

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
    return smartService.loadOrRegister(id2);
  }).then(function() {
    // We can call predict and update on id2 (a loaded learner).
    t.doesNotThrow(
      function() { smartService.record(id2, 'some input'); },
      'loaded learners can update'
    );
    t.doesNotThrow(
      function() { smartService.predict(id2, 'some other input'); },
      'loaded learners can predict'
    );

    // Additionally, the dumb learner's counts match.
    t.deepEqual(smartService.predict(id2, 'random input'), [1, 2],
      'learner 1 => record x1, predict x2');

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
  }).catch(t.end);
});