var mercury = require('mercury');

module.exports = methodStart;

/*
 * Indicate that the method is in-progress by appending to the method outputs.
 * data needs to have runID.
 */
function methodStart(state, method, data) {
  // TODO(alexfandrianto): Instead of now displaying for 25 ms, consider
  // showing a loading icon right away. The result can be revealed when it
  // arrives, or after ~200 ms.
  var output = mercury.varhash({
    runID: data.runID,
    shouldShow: false,
    method: method,
    result: '<running>'
  });
  setTimeout(function() {
    output.put('shouldShow', true); // prevent flicker for near-instant RPCs.
  }, 25);
  state.methodOutputs.push(output);
}