var purgeMercuryArray = require('../../../lib/mercury/purgeMercuryArray');
var browseService = require('../../../services/browse-service');
var smartService = require('../../../services/smart-service');
var debug = require('debug')(
  'components:browse:item-details:display-item-details'
);
var methodForm = require('./method-form/index.js');

module.exports = displayItemDetails;

/*
 * Ask the browseService for a service signature.
 * Use the signature and smartService to pick which RPCs to do automatically.
 */
function displayItemDetails(state, events, data) {
  var name = data.name;

  // Don't refresh if we are already looking at this name's details.
  if (state.itemName() === name) {
    return;
  }
  // Log the URL to the smart service as a potential shortcut.
  smartService.record('learner-shortcut', {name: name});

  // Save every time we look at a service's details.
  smartService.save('learner-shortcut');

  // Set the new name and reset the selected method and outputs.
  // TODO(alexfandrianto): Instead of resetting, should we remember this info?
  state.itemName.set(name);
  purgeMercuryArray(state.methodOutputs);

  browseService.signature(name).then(function(signatureResult) {
    state.signature.set(signatureResult);

    // Go through each signature method, preparing the state needed for its form
    // to be rendered and deciding if the method should be recommended.
    for (var m in signatureResult) {
      if (signatureResult.hasOwnProperty(m)) {
        // Initialize the method form for future rendering.
        var form = methodForm(name, signatureResult, m, events.methodCalled);
        state.methodForm.put(m, form.state);
        events.methodForm.put(m, form.events);

        // TODO(alexfandrianto): Fill in the area below.
        /*
        x.events.methodForm.methodStart(
          // TODO(alexfandrianto): Handler for this method's start
        );
        x.events.methodForm.methodEnd(
          // TODO(alexfandrianto): Handler for this method's end
        );
        */

        // TODO(alexfandrianto): It's likely this logic will be moved to
        // renderMethod since these recommendations are no longer very useful.

        // Prepare data needed to predict if this method should be recommended.
        var param = signatureResult[m];
        var input = {
          name: name,
          methodName: m,
          signature: signatureResult,
          hasParams: param.inArgs.length !== 0
        };

        var details = state.details.get(data.name);

        // Ignore methods that take input parameters, already recommended
        // methods, and methods with no output (only error as an out argument).
        if (input.hasParams || (details && details[m] !== undefined) ||
            param.numOutArgs === 1) {
          continue;
        }

        // If the prediction power is strong enough, recommend the method.
        var prediction = smartService.predict('learner-autorpc', input);
        if (prediction > 0.5) {
          debug('Recommend', m, 'with', prediction);

          // Set the state detail with the prediction value (a float).
          var detail = state.details.get(data.name);
          if (detail === undefined) {
            detail = {};
          }
          detail[input.methodName] = prediction;
          state.details.put(input.name, detail);
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
