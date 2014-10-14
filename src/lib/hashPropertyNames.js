module.exports = hashPropertyNames;

/*
 * Given an arbitrary object, compute a reasonable hash for its property names.
 */
function hashPropertyNames(signature) {
  var names = Object.getOwnPropertyNames(signature);
  names.sort();
  return JSON.stringify(names);
}