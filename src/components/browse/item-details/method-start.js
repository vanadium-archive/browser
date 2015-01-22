var mercury = require('mercury');
var h = require('mercury').h;

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
    result: h('span', '<running>')
  });
  setTimeout(function() {
    output.put('shouldShow', true); // prevent flicker for near-instant RPCs.
  }, 25);
  var itemName = state.item().objectName;
  var outputs = state.methodOutputs.get(itemName);
  if (outputs === undefined) {
    state.methodOutputs.put(itemName, mercury.array([output]));
  } else {
    outputs.push(output);
  }
}