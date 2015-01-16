var h = require('mercury').h;
var smartService = require('../../../services/smart/service');
var log = require('../../../lib/log')(
  'components:browse:item-details:method-end');
var formatDetail = require('./format-detail');

module.exports = methodEnd;

/*
 * Use the data from a successful/failed RPC to record the results properly.
 * Note that the recorded results are rendered according to formatDetail.
 * Successful RPCs also update the smartService.
 * data needs to have runID and either (error) or (result and args)
 */
function methodEnd(state, method, data) {
  // Simply draw the error message if there was an error.
  if (data.error !== undefined) {
    formatResult(state, method, data.runID, data.error, false);
    return;
  }

  var sig = state.item().serverInfo.signature;

  // Otherwise, we'll have to learn from the results and draw them, if possible.
  var numInArgs = sig.get(method).inArgs.length;

  // Since the RPC was successful, we can assume the inputs were good.
  if (numInArgs > 0) {
    learnMethodInput(state, method, data.args);
    learnMethodInvocation(state, method, data.args);
  }

  // Do not process results we expect to be empty.
  // TODO(alexfandrianto): Streaming results are ignored with this logic.
  var expectedOutArgs = sig.get(method).outArgs.length;
  if (expectedOutArgs === 1) { // Error is the only possible out argument.
    replaceResult(state, data.runID, h('span', '<ok>'));
    return;
  }

  // Draw the results.
  formatResult(state, method, data.runID, data.result, numInArgs === 0);
}

/*
 * The result will be rendered, overwriting the placeholder identified by runID.
 */
function formatResult(state, method, runID, result, addToDetails) {
  // Use formatDetail to process the raw result into a renderable format.
  var formattedResult = formatDetail(result);

  // Then overwrite the old value.
  replaceResult(state, runID, formattedResult);
}

/*
 * Find the correct output replacement mercury struct and replace its result.
 * If the replacement cannot be found, then no substitution occurs.
 */
function replaceResult(state, runID, newResult) {
  var match = state.methodOutputs.get(state.item().objectName).filter(
    function matchesRunID(output) {
      return output.get('runID').equals(runID);
    }
  ).get(0);
  if (match !== undefined) {
    match.put('result', newResult);
  }
}

/*
 * Learn from the method inputs to be able to suggest them in the future.
 */
function learnMethodInput(state, method, args) {
  var sig = state.item().serverInfo.signature;
  args.forEach(function(value, i) {
    var argName = sig.get(method).inArgs[i].name;
    var input = {
      argName: argName,
      methodName: method,
      signature: sig,
      value: args[i]
    };
    log.debug('Update Input:', input);

    smartService.update('learner-method-input', input).catch(function(err) {
      log.error('Error while updating method input learner', err);
    });
  });
}

/*
 * Learn from this invocation to be able to suggest them in the future.
 */
function learnMethodInvocation(state, method, args) {
  var sig = state.item().serverInfo.signature;
  var input = {
    methodName: method,
    signature: sig,
    value: JSON.stringify(args)
  };
  log.debug('Update Invocation:', input);

  smartService.update('learner-method-invocation', input).catch(function(err) {
    log.error('Error while updating method invocation learner', err);
  });
}