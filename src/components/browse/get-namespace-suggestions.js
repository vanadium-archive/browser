var log = require('../../lib/log')('components:browse:browse-children');
var namespaceService = require('../../services/namespace/service');

module.exports = getNamespaceSuggestions;

/*
 * Default event handler for the getNamespaceSuggestions event.
 * Updates the necessary states when getNamespaceSuggestions is triggered.
 * Only does this if the browseState's namespacePrefix has changed.
 * Namespace is the target namespace whose children are to be retrieved.
 * TODO(alexfandrianto): Update this when we switch to the new glob service.
 */
function getNamespaceSuggestions(browseState, namespace) {
  var prefix = namespaceService.util.stripBasename(namespace);

  if (prefix === browseState.namespacePrefix()) {
    return; // The children are already based on the correct glob.
  }

  // Update the state prefix and clear out the children.
  browseState.namespacePrefix.set(prefix);
  emptyOutItems();

  // There is nothing to glob without a rooted name.
  if (prefix === '' || prefix === '/') {
    return;
  }

  // Glob the children using this prefix.
  namespaceService.getChildren(prefix).then(function received(items) {
    browseState.put('namespaceSuggestions', items);
  }).catch(function(err) {
    log.warn('Could not glob', prefix, err);
  });

  function emptyOutItems() {
    browseState.put('namespaceSuggestions', []);
  }
}

