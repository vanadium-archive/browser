/*
 * The store allows key-value store for string keys and any value.
 */
var log = require('./log')('lib:store');

module.exports = {
  hasValue: hasValue,
  setValue: setValue,
  getValue: getValue,
  removeValue: removeValue,
  getKeysWithPrefix: getKeysWithPrefix
};

/*
 * Given a string identifier, return if the key has a value is in localStorage.
 */
function hasValue(key) {
  return localStorage.getItem(key) !== null;
}

/*
 * Given a string identifier and any value, JSON encode the value and
 * place it into localStorage.
 */
function setValue(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

/*
 * Given a string identifier, return the JSON decoded value from localStorage.
 * Returns null if the value was not present or could not be parsed.
 */
function getValue(key) {
    var value = localStorage.getItem(key); // value is string or null
    try {
        return JSON.parse(value);
    } catch (exception) {
        log.error('JSON parse failed for key:', key, 'and value:', value);
    }
    return null;
}

/*
 * Given a string identifier, remove the associated value from localStorage.
 */
function removeValue(key) {
    localStorage.removeItem(key);
}

/*
 * Given a string prefix, return the corresponding local storage keys.
 * TODO(alexfandrianto): Very inefficient for local storage. Avoid using.
 * Upgrade to glob once the store is ready.
 */
function getKeysWithPrefix(key) {
  var keys = [];
  for (var i = 0; i < localStorage.length; i++) {
    var candidate = localStorage.key(i);
    if (candidate.indexOf(key) === 0) {
      keys.push(candidate);
    }
  }
  return keys;
}