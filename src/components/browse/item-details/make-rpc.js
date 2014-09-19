var browseService = require('../../../services/browse-service');
var smartService = require('../../../services/smart-service');
var debug = require('debug')('components:browse:item-details:make-rpc');
var renderDetail = require('./render-detail');

module.exports = makeRPC;

/*
 * Use the browseService to perform an RPC request.
 * Put the results in the state and record this request in the smartService.
 * Note that the recorded results are rendered according to renderDetail.
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
      debug('Received:', result);

      var expectedOutArgs = state.signature()[data.methodName].numOutArgs;
      // Do not process results we expect to be empty.
      // TODO(alexfandrianto): Streaming results are ignored with this logic.
      if (expectedOutArgs === 1) { // Error is the only possible out argument.
        return;
      }

      // Use renderDetail to process the raw result into a renderable format.
      var renderedResult = renderDetail(result);
      state.methodOutputs.push(renderedResult);

      // If we received a result for a 0-parameter RPC, add to the details page.
      if (!data.hasParams) {
        // Store the data we received in our state for later rendering.
        var detail = state.details.get(data.name);
        if (detail === undefined) {
          detail = {};
        }
        detail[data.methodName] = renderedResult;
        state.details.put(data.name, detail);

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
    },
    function(err) {
      debug('Error during RPC',
        data.name,
        data.methodName,
        err, (err && err.stack) ? err.stack : undefined
      );
    }
  );
}