var vom = require('veyron').vom;

module.exports = adapt;
/*
 * Adapts from IPC service Signatures to a custom signature Map-specific
 * to this application. Service methods, pkgName, and descriptions are added.
 * TODO(aghasssemi): Consider separate signature instead of merging?
 */
function adapt(signatures) {
  var adaptedSig = new Map();
  adaptedSig.pkgNameDescriptions = [];
  signatures.forEach(function(sig) {
    if (sig.name) {
      adaptedSig.pkgNameDescriptions[sig.pkgPath + '.' + sig.name] = sig.doc;
    }
    sig.methods.forEach(function(method) {
      var key = vom.MiscUtil.uncapitalize(method.name);
      adaptedSig.set(key, method);
    });
  });

  return adaptedSig;
}