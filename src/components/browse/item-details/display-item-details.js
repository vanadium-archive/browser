var browseService = require('../../../services/browse-service');
var smartService = require('../../../services/smart-service');
var makeRPC = require('./make-rpc');
var debug = require('debug')('display-item-details');

module.exports = displayItemDetails;

/*
 * Ask the browseService for a service signature.
 * Use the signature and smartService to pick which RPCs to do automatically.
 */
function displayItemDetails(state, data) {
  var name = data.name;

  // Don't refresh if we are already looking at this name's details.
  if (state.itemName() === name) {
    return;
  }
  // Set the new name and reset the selected method and outputs.
  // TODO(alexfandrianto): Instead of resetting, should we remember this info?
  state.itemName.set(name);
  state.selectedMethod.set('');
  // TODO(aghassemi)
  // any better way than splice to tell Mercury all of array changed?
  state.methodOutputs.splice(0, state.methodOutputs.getLength());

  browseService.signature(name).then(function(signatureResult) {
    state.signature.set(signatureResult);

    // Go through each signature method and decide whether to perform it or not.
    for (var m in signatureResult) {
      if (signatureResult.hasOwnProperty(m)) {
        var param = signatureResult[m];
        var input = {
          name: name,
          methodName: m,
          signature: signatureResult,
          hasParams: param.inArgs.length !== 0,
        };

        // TODO(alexfandrianto): Improve decision-making for parameterless RPCs.
        var prediction = smartService.predict('learner-autorpc', input);
        if (prediction > 0.6) {
          debug('AutoRPC:', m);
          makeRPC(state, input);
        }
      }
    }

  }, function(err) {
    debug('Failed to get signature',
      name,
      err, (err && err.stack) ? err.stack : undefined
    );
    state.signature.set('');
  });
}