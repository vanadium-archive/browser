//TODO(aghassemi) move to core Veyron API. Rename to Promise.Any

exports.resolveRace = resolveRace;

/**
 * resolveRace returns a promise that resolves when the first promise
 * resolves and rejects only after every promise has rejected.
 * @param {promise[]} promises a list of promises.
 * @return {promse} a promise that resolves when any of the inputs resolve, or
 * when all of the inputs reject.
 */
function resolveRace(promises) {
  var resolve, reject;
  var promise = new Promise(function(pResolve, pReject) {
    resolve = pResolve;
    reject = pReject;
  });
  var numRejects = 0;
  var onReject = function(reason) {
    numRejects++;
    if (numRejects === promises.length) {
      reject(reason);
    }
  };

  for (var i = 0; i < promises.length; i++) {
    promises[i].then(resolve, onReject);
  }
  return promise;
}