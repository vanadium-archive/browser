var mercury = require('mercury');
var namespaceService = require('../../../services/namespace/service');
var smartService = require('../../../services/smart/service');
var log = require('../../../lib/log')(
  'components:browse:item-details:display-item-details'
);
var methodForm = require('./method-form/index.js');
var methodStart = require('./method-start.js');
var methodEnd = require('./method-end.js');

module.exports = displayItemDetails;

/*
 * Ask the namespaceService for a service signature.
 * Use the signature and smartService to pick which RPCs to do automatically.
 */
function displayItemDetails(state, events, data) {
  var name = data.name;

  // Log the URL to the smart service as a potential shortcut.
  smartService.update('learner-shortcut', {name: name}).catch(function(err) {
    log.error('Error while updating shortcut learner', err);
  });

  namespaceService.getNamespaceItem(name).then(function(itemObs) {
    state.put('item', itemObs);
    mercury.watch(itemObs, function(item) {
      if( !item.isServer ) {
        return;
      }

      // Go through each signature method, preparing the state needed for its
      // form to be rendered and deciding if the method should be recommended.
      var signatureResult = item.serverInfo.signature;
      for (var m in signatureResult) {
        if (signatureResult.hasOwnProperty(m)) {
          // Initialize the method form for future rendering.
          var form = methodForm();
          state.methodForm.put(m, form.state);
          events.methodForm.put(m, form.events);

          // Hook up the new form's method start, end, and toast events.
          form.events.methodStart(
            methodStart.bind(null, state, m)
          );
          form.events.methodEnd(
            methodEnd.bind(null, state, m)
          );
          form.events.toast = events.toast;

          // Finally, allow the form to gather the info it needs to display.
          form.events.displayMethodForm({
            itemName: name,
            signature: signatureResult,
            methodName: m
          });
        }
      }
    });
  }, function(err) {
    log.error('Failed to get item:', name, err);
    state.put('item', null);
  }).catch(function(err) {
    log.error('Error when handling the received item', name, err);
    state.put('item', null);
  });
}
