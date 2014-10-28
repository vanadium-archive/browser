var mercury = require('mercury');
var _ = require('lodash');
var log = require('../../lib/log')('components:browse:recommend-shortcuts');
var namespaceService = require('../../services/namespace/service');
var smartService = require('../../services/smart/service');

module.exports = recommendShortcuts;

/*
 * Asks the smartService to asynchronously update the browseState with the
 * associated recommendations.
 */
function recommendShortcuts(browseState) {
  var input = {
    'name': '',
    'exclude': _.pluck(browseState.userShortcuts(), 'objectName')
  };
  smartService.predict('learner-shortcut', input).then(function(predictions) {
    browseState.put('recShortcuts', mercury.array([]));
    predictions.forEach(function(prediction, i) {
      namespaceService.getNamespaceItem(prediction.item).then(function(item) {
        browseState.recShortcuts.put(i, item);
      }).catch(function(err) {
        log.error('Failed to get recommended shortcut:', prediction, err);
      });
    });
  }).catch(function(err) {
    log.error('Could not load recommended shortcuts', err);
  });
}