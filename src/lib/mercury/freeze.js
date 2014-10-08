module.exports = freeze;

/*
 * Makes an observable into an immutable observable.
 */
function freeze(observable) {
  return function observe(fn) {
    return observable(fn);
  };
}