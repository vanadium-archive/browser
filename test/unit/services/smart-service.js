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
  smartService.loadOrRegister(
    id,
    smartService.constants.LEARNER_DUMB,
    { learningRate: 0.1, regularize: false }
  );
}

test('record and predict', function(t) {
  var id1 = 'first';
  var id2 = 'second';
  makeLearner(id1);
  makeLearner(id2);

  // The # of predictions increases as we call predict.
  t.deepEqual(smartService.predict(id1, 'some input'), [0, 1]);
  t.deepEqual(smartService.predict(id1, 'some input'), [0, 2]);
  t.deepEqual(smartService.predict(id2, 'some input'), [0, 1]);

  // If we record, then the relevant learner is also called.
  smartService.record(id1, 'some input');
  smartService.record(id2, 'some input');
  smartService.record(id2, 'some input');
  t.deepEqual(smartService.predict(id1, 'some input'), [1, 3]);
  t.deepEqual(smartService.predict(id2, 'some input'), [2, 2]);

  t.end();
});

test('save, load, and reset', function(t) {
  var id1 = 'third';
  var id2 = 'fourth';

  // The store does not have these values initially.
  t.deepEqual([store.getValue(id1), store.getValue(id2)], [null, null]);

  // Make 1 learner. Saving enters the value into the store.
  makeLearner(id1);
  smartService.save(id1);
  t.notEqual(store.getValue(id1), null); // stored value isn't null

  // Copy the learner and save it into the store.
  store.setValue(id2, store.getValue(id1));

  // Load the other service. It's not in the store.
  smartService.loadOrRegister(id2); // will have loaded it.
  t.notEqual(store.getValue(id2), null);

  // Even though id2 was loaded, we can still call predict and update on it.
  t.doesNotThrow(
    function() { smartService.record(id2, 'some input'); },
    'loaded learners can still update'
  );
  t.doesNotThrow(
    function() { smartService.predict(id2, 'some other input'); },
    'loaded learners can still predict'
  );

  // Additionally, the dumb learner's counts match.
  t.deepEqual(smartService.predict(id2, 'random input'), [1, 2]);

  // Saving id2 into the store makes it appear.
  smartService.save(id2);
  t.notEqual(store.getValue(id2), null); // stored value isn't null

  // Resetting removes from the store.
  smartService.reset(id1);
  t.equal(store.getValue(id1), null);

  // The learner that was not reset is still in the store
  t.notEqual(store.getValue(id2), null); // stored value isn't null

  // Until we clean it up.
  smartService.reset(id2);
  t.equal(store.getValue(id2), null);

  t.end();
});