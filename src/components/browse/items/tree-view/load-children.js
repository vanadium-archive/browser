var namespaceService = require('../../../../services/namespace/service');

var log = require('../../../../lib/log')(
  'components:browse:tree-view:load-children');

module.exports = loadChildren;

function loadChildren(state, data) {
  var parentName = data.parentName;

  return namespaceService.getChildren(parentName)
    .then(function childrenReceived(items) {
      //TODO(aghassemi) prefix parentName due to invalid key names like delete
      state.childrenMap.put(parentName, items);
    }).catch(function(err) {
      //TODO(aghassemi) Go to error page
      log.error(err);
    });

}