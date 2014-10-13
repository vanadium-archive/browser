module.exports = freeze;

/*
 * List of array methods that can't cause mutation
 */
var IMMUTABLE_ARRAY_METHODS = [
'concat', 'slice', 'every', 'filter', 'forEach', 'indexOf',
'join', 'lastIndexOf', 'map', 'reduce', 'reduceRight',
'some', 'toString', 'toLocaleString' ];

/*
 * Makes an observable into an immutable observable.
 */
function freeze(observable) {

  function immutableObservable(fn) {
    return observable(fn);
  }

  // TODO(aghassemi) Uncomment the condition when
  // Pull Request #15 in Raynos/observ-array is merged
  //if(observable._type === 'observ-array') {
    copyMethods(immutableObservable, observable, IMMUTABLE_ARRAY_METHODS);
  //}

  return immutableObservable;
}

function copyMethods(target, source, methods) {
  methods.forEach(function (name) {
    target[name] = function() {
      var result = source[name].apply(source, arguments);
      // If result is an observable itself, freeze it again.
      if( typeof result === 'function' ) {
        result = freeze(result);
      }
      return result;
    };
  });
}