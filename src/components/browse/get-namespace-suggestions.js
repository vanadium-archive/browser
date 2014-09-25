var purgeMercuryArray = require('../../lib/mercury/purgeMercuryArray');
var debug = require('debug')('components:browse:browse-children');
var browseService = require('../../services/browse-service');

module.exports = getNamespaceSuggestions;

/*
 * Default event handler for the getNamespaceSuggestions event.
 * Updates the necessary states when getNamespaceSuggestions is triggered.
 * Only does this if the browseState's namespacePrefix has changed.
 * Namespace is the target namespace whose children are to be retrieved.
 * TODO(alexfandrianto): Update this when we switch to the new glob service.
 */
function getNamespaceSuggestions(browseState, namespace) {
  var prefix = browseService.getPrefix(namespace);

  if (prefix === browseState.namespacePrefix()) {
    return; // The children are already based on the correct glob.
  }

  // Update the state prefix and clear out the children.
  browseState.namespacePrefix.set(prefix);
  purgeMercuryArray(browseState.namespaceSuggestions);

  // There is nothing to glob without a rooted name.
  if (prefix === '' || prefix === '/') {
    return;
  }

  // Glob the children using this prefix.
  browseService.glob(prefix, '*').then(function received(globResult) {
    debug('Name and Glob result', namespace, globResult);
    globResult.forEach(function(i) {
      browseState.namespaceSuggestions.push(i.mountedName);
    });
  });
}