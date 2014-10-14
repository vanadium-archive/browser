/*
 * smart-service-implementation includes this application's specific
 * implementations of the smart-service.
 */

var addAttributes = require('../lib/addAttributes');
var log = require('../lib/log')('services:smart-service');
var perceptron = require('../lib/learning/perceptron');
var rank = require('../lib/learning/rank');
var hashPropertyNames = require('../lib/hashPropertyNames');
var _ = require('lodash');

var LEARNER_SHORTCUT = 1;
var LEARNER_AUTORPC = 2;
var LEARNER_METHOD_INPUT = 3;
var LEARNER_METHOD_INVOCATION = 4;

// Associate the learner types with the constructor
var LEARNER_MAP = {};
LEARNER_MAP[LEARNER_SHORTCUT] = shortcutLearner;
LEARNER_MAP[LEARNER_AUTORPC] = autoRPCLearner;
LEARNER_MAP[LEARNER_METHOD_INPUT] = methodInputLearner;
LEARNER_MAP[LEARNER_METHOD_INVOCATION] = methodInvocationLearner;

// Associate the learner types with additional functions.
// Note: update and predict are required.
var LEARNER_METHODS = {};
LEARNER_METHODS[LEARNER_SHORTCUT] = {
  featureExtractor: shortcutLearnerFeatureExtractor,
  update: shortcutLearnerUpdate,
  predict: shortcutLearnerPredict
};
LEARNER_METHODS[LEARNER_AUTORPC] = {
  featureExtractor: autoRPCLearnerFeatureExtractor,
  update: autoRPCLearnerUpdate,
  predict: autoRPCLearnerPredict
};
LEARNER_METHODS[LEARNER_METHOD_INPUT] = {
  computeKey: methodInputLearnerComputeKey,
  update: topKLearnerUpdate,
  predict: topKLearnerPredict
};

LEARNER_METHODS[LEARNER_METHOD_INVOCATION] = {
  computeKey: methodInvocationLearnerComputeKey,
  update: topKLearnerUpdate,
  predict: topKLearnerPredict
};

// Export the implementation constants
module.exports = {
  LEARNER_SHORTCUT: LEARNER_SHORTCUT,
  LEARNER_AUTORPC: LEARNER_AUTORPC,
  LEARNER_METHOD_INPUT: LEARNER_METHOD_INPUT,
  LEARNER_METHOD_INVOCATION: LEARNER_METHOD_INVOCATION,
  LEARNER_MAP: LEARNER_MAP,
  LEARNER_METHODS: LEARNER_METHODS
};

/*
 * Create a shortcut learner that analyzes directory paths visited and predicts
 * the most useful shortcuts.
 * The expected attributes in params include:
 * - k, the max # of shortcuts to return
 */
function shortcutLearner(type, params) {
  this.directoryCount = {};
  this.type = type;
  this.params = params;
  addAttributes(this, LEARNER_METHODS[type]);
}

/*
 * Given input data, return relevant features for the shortcut learner.
 */
function shortcutLearnerFeatureExtractor(input) {
  return pathFeatureExtractor(input);
}

/*
 * Given an input, extract the relevant feature vector and update the weights
 * of the learner.
 */
function shortcutLearnerUpdate(input) {
  var features = this.featureExtractor(input.name);
  for (var key in features) {
  	if (features.hasOwnProperty(key)) {
	    if (this.directoryCount[key] === undefined) {
	      this.directoryCount[key] = 0;
	    }
	    this.directoryCount[key] += features[key];
    }
  }
}

/*
 * Given an input path, determine which children are most popular.
 */
function shortcutLearnerPredict(input) {
  // Make sure to give input a proper string value.
  if (input === undefined || input === null) {
    input = '';
  }

  // Also ensure that k, the number of children to return, is defined.
  var k = this.params.k;
  if (k === undefined || k === null) {
    k = 1;
  }

  log.debug('Predict top', k, 'children under', input,
    'with', this.directoryCount);

  // First score all the items.
  var scoredItems = [];
  for (var key in this.directoryCount) {
    if (this.directoryCount.hasOwnProperty(key) && key.indexOf(input) === 0) {
      scoredItems[scoredItems.length] = {
        item: key,
        score: this.directoryCount[key]
      };
    }
  }

  // Then determine the top k items including diversity.
  // TODO(alexfandrianto): This step forces us to take O(kn) runtime. Is there a
  // faster way to find the 'best' shortcuts?
  var topK = [];
  for (var i = 0; i < k; i++) {
    var bestItemIndex = rank.getBestItemIndex(scoredItems);
    if (bestItemIndex >= 0) {
      topK.push(scoredItems[bestItemIndex]);
    } else {
      return topK; // return early since there are no more top items.
    }

    // If we haven't yet found all topK, penalize similar items.
    if (i < k - 1) {
      // Remove the most recent top item, and return early if we can.
      scoredItems.splice(bestItemIndex, 1);
      if (scoredItems.length === 0) {
        return topK;
      }

      // Otherwise, penalize all remaining items.
      rank.applyDiversityPenalty(
        scoredItems,
        topK[i],
        shortcutLearnerFeatureExtractor,
        topK[i].score
      );
    }
  }

  return topK;
}

/*
 * TODO(alexfandrianto): Don't ignore 'params'. Improve this algorithm.
 * Create an autorpc learner that learns which RPCs should be performed
 * automatically.
 */
function autoRPCLearner(type, params) {
  this.weights = {};
  this.type = type;
  this.learningRate = 0.05;
  addAttributes(this, LEARNER_METHODS[type]);
}

/*
 * Given input data, return an appropriate feature vector for RPCs.
 * Input must have: methodName, signature, and name.
 */
function autoRPCLearnerFeatureExtractor(input) {
  var features = {};

  // The user may have an innate bias for making RPCs.
  features['_biasTerm'] = 1;

  // Same-named methods may act similarly and might want to be queried too.
  features[input.methodName] = 1;

  // Same-named methods that share service signatures are likely similar.
  features[input.methodName + '|' + hashPropertyNames(input.signature)] = 1;

  // Services in the same namespace subtree may be queried similarly.
  var pathFeatures = pathFeatureExtractor(input.name);
  addAttributes(features, pathFeatures);

  // Services in the same namespace subtree with this method name are also
  // likely to be queried similarly.
  for (var key in pathFeatures) {
  	if (pathFeatures.hasOwnProperty(key)) {
    	features[input.methodName + '|' + key] = pathFeatures[key];
    }
  }
  return features;
}

/*
 * Given input data, update the learner's weights.
 * Input must have: methodName, signature, name, and reward.
 * TODO(alexfandrianto): Remove the weights printout.
 */
function autoRPCLearnerUpdate(input) {
  perceptron.update(
    this.weights,
    this.featureExtractor(input),
    input.reward,
    this.learningRate
  );
  log.debug('Final weights: ', this.weights);
}

/*
 * Given input data, return the predicted reward.
 */
function autoRPCLearnerPredict(input) {
  return perceptron.predict(this.weights, this.featureExtractor(input));
}

/*
 * Create a method input learner that suggests the most likely inputs to a
 * given argument of a method.
 * Params can optionally include:
 * - minThreshold, the minimum score of a suggestable value
 * - maxValues, the largest number of suggestable values that may be returned
 * - penalty, a constant for the rate to penalize incorrect suggestions
 * - reward, a constant for the rate to reward chosen values
 *
 * Uses a simple topK Update and Prediction function.
 * This learner's input needs to have argName, methodName, and signature.
 * Update also needs an argument value.
 */
function methodInputLearner(type, params) {
  this.type = type;
  this.inputMap = {}; // map[string]map[string]number

  // Override the default params with relevant fields from params.
  this.params = {
    penalty: 0.1,
    reward: 0.4
  };
  _.assign(this.params, params);

  addAttributes(this, LEARNER_METHODS[type]);
}

/*
 * Given input data, compute the appropriate lookup key.
 */
function methodInputLearnerComputeKey(input) {
  var keyArr = [
    hashPropertyNames(input.signature),
    input.methodName,
    input.argName
  ];
  return keyArr.join('|');
}

/*
 * Create a method invocation learner that suggests the most likely invocations
 * for a given method.
 * Params can optionally include:
 * - minThreshold, the minimum score of a suggestable value
 * - maxValues, the largest number of suggestable values that may be returned
 * - penalty, a constant for the rate to penalize incorrect suggestions
 * - reward, a constant for the rate to reward chosen values
 *
 * Uses a simple topK Update and Prediction function.
 * This learner's input needs to have a methodName and signature.
 * Update also needs a JSON-encoded arguments string.
 */
function methodInvocationLearner(type, params) {
  this.type = type;
  this.inputMap = {}; // map[string]map[string]number

  // Override the default params with relevant fields from params.
  this.params = {
    penalty: 0.1,
    reward: 0.4
  };
  _.assign(this.params, params);

  addAttributes(this, LEARNER_METHODS[type]);
}

/*
 * Given input data, compute the appropriate lookup key
 * Input must have: methodName and signature.
 */
function methodInvocationLearnerComputeKey(input) {
  var keyArr = [
    hashPropertyNames(input.signature),
    input.methodName
  ];
  return keyArr.join('|');
}

/*
 * Given input data, boost the rank of the given value and penalize others.
 * Note: Learners using this predict function need to be similar structurally.
 */
function topKLearnerUpdate(input) {
  var key = this.computeKey(input);
  var predValues = this.predict(input);
  var value = input.value;

  // Setup the inputMap and values if not yet defined.
  if (this.inputMap[key] === undefined) {
    this.inputMap[key] = {};
  }
  var values = this.inputMap[key];
  if (values[value] === undefined) {
    values[value] = 0;
  }

  // Give a reward to the chosen value.
  values[value] += this.params.reward * (1 - values[value]);

  // Induce a penalty on failed predictions.
  for (var i = 0; i < predValues.length; i++) {
    var pred = predValues[i];
    if (pred !== value) {
      values[pred] += this.params.penalty * (0 - values[pred]);
    }
  }
}

/*
 * Given input data, predict the most likely values.
 * Note: Learners using this predict function need to be similar structurally.
 */
function topKLearnerPredict(input) {
  var key = this.computeKey(input);
  var values = this.inputMap[key];

  // Immediately return nothing if there are no values to suggest.
  if (values === undefined) {
    return [];
  }

  // Convert the values to scored items for ranking.
  var scoredItems = Object.getOwnPropertyNames(values).map(
    function getScoredItem(value) {
      return {
        item: value,
        score: values[value]
      };
    }
  );

  // Filter the scored items by minThreshold
  if (this.params.minThreshold !== undefined) {
    scoredItems = scoredItems.filter(function applyThreshold(scoredItem) {
      return scoredItem.score >= this.params.minThreshold;
    }, this);
  }

  // Rank the scored items and return the top values (limit to maxValues)
  var maxValues = this.params.maxValues;
  if (maxValues === undefined) {
    maxValues = scoredItems.length;
  }
  var bestK = rank.getBestKItems(scoredItems, maxValues);
  return bestK === null ? [] : bestK.map(function(goodItem) {
    return goodItem.item;
  });
}

/*
 * Given a path string, this feature extractor assigns diminishing returns
 * credit to each ancestor along the path.
 */
function pathFeatureExtractor(path) {
  var vector = {};
  var split = path.split('/');
  var growingPath = '';
  for (var i = 0; i < split.length; i++) {
    if (split[i] === '') {
      continue;
    }
    if (i === 0) {
      growingPath += split[i];
    } else {
      growingPath += '/' + split[i];
    }
    // give 1, 1/2, 1/4, 1/8, ... credit assignment
    vector[growingPath] = Math.pow(2, i+1-split.length);
  }
  return vector;
}