var vom = require('vom');

module.exports = adapt;
/*
 * Adapts from IPC service Signatures to a custom signature struct specific
 * to this application.
 * TODO(aghasssemi) Consider separate signature instead of merging?
 */
function adapt(signatures) {
  var adaptedSig = new Map();

  signatures.forEach(function(sig) {
    sig.methods.forEach( function(method) {
      var key = vom.MiscUtil.uncapitalize(method.name);
      adaptedSig.set(key, method);
    });
  });

  return adaptedSig;
}