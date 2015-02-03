var formatDetail = require('./format-detail');

var smartService = require('../../../services/smart/service');
var getMethodData =
  require('../../../services/namespace/service').getMethodData;

var log = require('../../../lib/log')(
  'components:browse:item-details:method-end');

var h = require('mercury').h;

module.exports = methodEnd;

/*
 * Use the data from a successful/failed RPC to record the results properly.
 * Note that the recorded results are rendered according to formatDetail.
 * Successful RPCs also update the smartService.
 * data needs to have runID and either (error) or (result and args)
 */
function methodEnd(state, method, interface, data) {
  // Simply draw the error message if there was an error.
  if (data.error !== undefined) {
    formatResult(state, method, data.runID, data.error, false);
    return;
  }

  // Otherwise, we'll have to learn from the results and draw them, if possible.
  var params = getMethodData(interface, method);
  var numInArgs = params.inArgs.length;

  // Since the RPC was successful, we can assume the inputs were good.
  if (numInArgs > 0) {
    learnMethodInput(method, interface, data.args);
    learnMethodInvocation(method, interface, data.args);
  }

  // Do not process results we expect to be empty. Instead, indicate that the
  // RPC terminated successfully.
  // TODO(alexfandrianto): Streaming results are ignored with this logic.
  var expectedOutArgs = params.outArgs.length;
  if (expectedOutArgs === 0) {
    replaceResult(state, data.runID, h('span', '<ok>'));
    return;
  }

  // Draw the results.
  formatResult(state, method, data.runID, data.result);
}

/*
 * The result will be rendered, overwriting the placeholder identified by runID.
 */
function formatResult(state, method, runID, result) {
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
      return output.get('runID') === runID;
    }
  ).get(0);
  if (match !== undefined) {
    match.put('result', newResult);
  }
}

/*
 * Learn from the method inputs to be able to suggest them in the future.
 */
function learnMethodInput(method, interface, args) {
  args.forEach(function(value, i) {
    var argName = getMethodData(interface, method).inArgs[i].name;
    var input = {
      argName: argName,
      methodName: method,
      interface: interface,
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
function learnMethodInvocation(method, interface, args) {
  var input = {
    methodName: method,
    interface: interface,
    value: JSON.stringify(args)
  };
  log.debug('Update Invocation:', input);

  smartService.update('learner-method-invocation', input).catch(function(err) {
    log.error('Error while updating method invocation learner', err);
  });
}
