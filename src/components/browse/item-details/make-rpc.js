var browseService = require('../../../services/browse-service');
var smartService = require('../../../services/smart-service');
var debug = require('debug')('components:browse:item-details:make-rpc');
var formatDetail = require('./format-detail');

module.exports = makeRPC;

/*
 * Use the browseService to perform an RPC request.
 * Put the results in the state and record this request in the smartService.
 * Note that the recorded results are rendered according to formatDetail.
 * data needs to have (name, methodName, args, hasParams, signature)
 */
function makeRPC(state, data) {
  // TODO(alexfandrianto): Once JS signatures have type information and/or VOM
  // gets better, we can be smarter about this.
  // Parse if possible. Otherwise, a string (or invalid JSON) will be used.
  // Solves a problem where booleans did not seem to be parsed properly.
  var args = data.args.map(function(arg) {
    try {
      return JSON.parse(arg);
    } catch(e) {
      return arg;
    }
  });

  browseService.makeRPC(data.name, data.methodName, args).then(
    function(result) {
      // Since the RPC was successful, we can assume the inputs were good.
      if (data.signature[data.methodName].inArgs.length > 0) {
        learnMethodInput(state, data);
        learnMethodInvocation(state, data);
      }

      // Do not process results we expect to be empty.
      // TODO(alexfandrianto): Streaming results are ignored with this logic.
      var expectedOutArgs = state.signature()[data.methodName].numOutArgs;
      if (expectedOutArgs === 1) { // Error is the only possible out argument.
        return;
      }

      // Draw the results.
      formatResult(state, data, result);

      // Learn which parameterless RPCs are good to recommend.
      if (!data.hasParams) {
        learnAutoRPC(state, data);
      }
    }
  ).catch(
    function(err) {
      debug('Error during RPC',
        data.name,
        data.methodName,
        err, (err && err.stack) ? err.stack : undefined
      );

      // Also add the fact that there was a failure to the method outputs.
      formatResult(state, data, err);
    }
  );
}

/*
 * The result will be rendered. The rendering is stored in the state.
 */
function formatResult(state, data, result) {
  // Use formatDetail to process the raw result into a renderable format.
  var formattedResult = formatDetail(result);
  state.methodOutputs.push([data.methodName, formattedResult]);

  // If we received a result for a 0-parameter RPC, add to the details page.
  if (!data.hasParams) {
    var detail = state.details.get(data.name);
    if (detail === undefined) {
      detail = {};
    }
    detail[data.methodName] = formattedResult;
    state.details.put(data.name, detail);
  }
}

/*
 * Learn from the method inputs to be able to suggest them in the future.
 */
function learnMethodInput(state, data) {
  for (var i = 0; i < data.args.length; i++) {
    var argName = data.signature[data.methodName].inArgs[i];
    var input = {
      argName: argName,
      methodName: data.methodName,
      signature: data.signature,
      value: data.args[i]
    };
    debug('Update Input:', input);

    smartService.record('learner-method-input', input);

    // For debug, display what our prediction would be.
    debug('PredictMI:', smartService.predict('learner-method-input', input));

    // Save after learning.
    smartService.save('learner-method-input');
  }
}

/*
 * Learn from this invocation to be able to suggest them in the future.
 */
function learnMethodInvocation(state, data) {
  var input = {
    methodName: data.methodName,
    signature: data.signature,
    value: JSON.stringify(data.args)
  };
  debug('Update Invocation:', input);

  smartService.record('learner-method-invocation', input);

  // For debug, display what our prediction would be.
  debug(
    'PredictMIv:',
    smartService.predict('learner-method-invocation', input)
  );

  // Save after learning.
  smartService.save('learner-method-invocation');
}

/*
 * Learn to recommend this method to the user.
 */
function learnAutoRPC(state, data) {
  // Log the successful RPC to the smart service.
  var input = {
    methodName: data.methodName,
    signature: data.signature,
    name: data.name,
    reward: 1
  };
  smartService.record('learner-autorpc', input);

  // For debug, display what our prediction would be.
  debug('PredictA:', smartService.predict('learner-autorpc', input));

  // Save after making a successful parameterless RPC.
  smartService.save('learner-autorpc');
}
