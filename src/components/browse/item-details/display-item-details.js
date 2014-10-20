var namespaceService = require('../../../services/namespace/service');
var smartService = require('../../../services/smart-service');
var log = require('../../../lib/log')(
  'components:browse:item-details:display-item-details'
);
var methodForm = require('./method-form/index.js');
var methodStart = require('./method-start.js');
var methodEnd = require('./method-end.js');

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

  // Set the new name.
  state.itemName.set(name);

  namespaceService.getSignature(name).then(function(signatureResult) {
    state.signature.set(signatureResult);

    // Go through each signature method, preparing the state needed for its form
    // to be rendered and deciding if the method should be recommended.
    for (var m in signatureResult) {
      if (signatureResult.hasOwnProperty(m)) {
        // Initialize the method form for future rendering.
        var form = methodForm(name, signatureResult, m);
        state.methodForm.put(m, form.state);
        events.methodForm.put(m, form.events);

        // Hook up the new form's method start and end events.
        form.events.methodStart(
          methodStart.bind(null, state, m)
        );
        form.events.methodEnd(
          methodEnd.bind(null, state, m)
        );
      }
    }
  }, function(err) {
    log.error('Failed to get signature',
      name,
      err, (err && err.stack) ? err.stack : undefined
    );
    state.signature.set('');
  }).catch(function(err) {
    log.error('Error when handling the received signature', err);
  });
}
