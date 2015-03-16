var log = require('../../lib/log')('components:browse:browse-children');
var namespaceService = require('../../services/namespace/service');

module.exports = getNamespaceSuggestions;

/*
 * Default event handler for the getNamespaceSuggestions event.
 * Updates the necessary states when getNamespaceSuggestions is triggered.
 * Only does this if the browseState's namespacePrefix has changed.
 * Namespace is the target namespace whose children are to be retrieved.
 */
function getNamespaceSuggestions(browseState, namespace) {
  // Get children of the chosen prefix.
  // When there is a trailing slash, treat the namespace as the prefix.
  var prefix;
  var len = namespace.length;
  var lastSlashIndex = namespace.lastIndexOf('/');
  if (len > 1 && lastSlashIndex === len - 1) {
    prefix = namespace.substring(0, lastSlashIndex);
  } else {
    prefix = namespaceService.util.stripBasename(namespace);
  }

  if (prefix === browseState.namespacePrefix()) {
    return; // The children are already based on the correct glob.
  }

  // Update the state prefix and clear out the children.
  browseState.namespacePrefix.set(prefix);
  emptyOutItems();

  // Do not search if selecting a namespace root.
  if (prefix === '' && namespace[0] === '/') {
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

