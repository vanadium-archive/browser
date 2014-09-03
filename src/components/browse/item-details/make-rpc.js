var browseService = require('../../../services/browse-service');
var smartService = require('../../../services/smart-service');
var debug = require('debug')('make-rpc');

module.exports = makeRPC;

/*
 * Use the browseService to perform an RPC request.
 * Put the results in the state and record this request in the smartService.
 * data needs to have (name, methodName, args, hasParams, signature)
 */
function makeRPC(state, data) {
  browseService.makeRPC(data.name, data.methodName, data.args).then(
    function(result) {
      debug('Received:', result);
      if (result.toString().length > 0) {
        state.methodOutputs.push(JSON.stringify(result));
      }

      // If we received a result for a 0-parameter RPC, add to the details page.
      // TODO(alexfandrianto): Remove the debug lines in this block.
      if (!data.hasParams && result.toString().length > 0) {
        // Store the data we received in our state for later rendering.
        var detail = state.details.get(data.name);
        if (detail === undefined) {
          detail = {};
        }
        detail[data.methodName] = JSON.stringify(result); // convert to string
        state.details.put(data.name, detail);

        // Log the successful RPC to the smart service.
        var input = {
          methodName: data.methodName,
          signature: data.signature,
          name: data.name,
          reward: 1,
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