var smartService = require('../../../services/smart-service');
var debug = require('debug')('components:browse:item-details:method-end');
var formatDetail = require('./format-detail');

module.exports = methodEnd;

/*
 * Use the data from a successful/failed RPC to record the results properly.
 * Note that the recorded results are rendered according to formatDetail.
 * Successful RPCs also update the smartService.
 * data needs to have either (error) or (result and args)
 */
function methodEnd(state, method, data) {
  // Simply draw the error message if there was an error.
  if (data.error !== undefined) {
    formatResult(state, method, data.error, false);
    return;
  }

  // Otherwise, we'll have to learn from the results and draw them, if possible.
  var numInArgs = state.signature()[method].inArgs.length;

  // Since the RPC was successful, we can assume the inputs were good.
  if (numInArgs > 0) {
    learnMethodInput(state, method, data.args);
    learnMethodInvocation(state, method, data.args);
  }

  // Do not process results we expect to be empty.
  // TODO(alexfandrianto): Streaming results are ignored with this logic.
  var expectedOutArgs = state.signature()[method].numOutArgs;
  if (expectedOutArgs === 1) { // Error is the only possible out argument.
    return;
  }

  // Draw the results.
  formatResult(state, method, data.result, numInArgs === 0);

  // Learn which parameterless RPCs are good to recommend.
  if (numInArgs === 0) {
    learnAutoRPC(state, method);
  }
}

/*
 * The result will be rendered. The rendering is stored in the state.
 */
function formatResult(state, method, result, addToDetails) {
  // Use formatDetail to process the raw result into a renderable format.
  var formattedResult = formatDetail(result);
  state.methodOutputs.push([method, formattedResult]);

  // If we received a result for a 0-parameter RPC, add to the details page.
  if (addToDetails) {
    var name = state.itemName();
    var detail = state.details.get(name);
    if (detail === undefined) {
      detail = {};
    }
    detail[method] = formattedResult;
    state.details.put(name, detail);
  }
}

/*
 * Learn from the method inputs to be able to suggest them in the future.
 */
function learnMethodInput(state, method, args) {
  for (var i = 0; i < args.length; i++) {
    var argName = state.signature()[method].inArgs[i];
    var input = {
      argName: argName,
      methodName: method,
      signature: state.signature(),
      value: args[i]
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
function learnMethodInvocation(state, method, args) {
  var input = {
    methodName: method,
    signature: state.signature(),
    value: JSON.stringify(args)
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
function learnAutoRPC(state, method) {
  // Log the successful RPC to the smart service.
  var input = {
    methodName: method,
    signature: state.signature(),
    name: state.itemName(),
    reward: 1
  };
  smartService.record('learner-autorpc', input);

  // For debug, display what our prediction would be.
  debug('PredictA:', smartService.predict('learner-autorpc', input));

  // Save after making a successful parameterless RPC.
  smartService.save('learner-autorpc');
}
