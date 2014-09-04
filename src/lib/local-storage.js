/*
 * local-storage allows key-value store for string keys and any value.
 */

module.exports = {
  setValue: setValue,
  getValue: getValue,
  removeValue: removeValue
};

/*
 * Given a string identifier and any value, JSON encode the value and
 * place it into localStorage.
 */
function setValue(name, value) {
    localStorage.setItem(name, JSON.stringify(value));
}

/*
 * Given a string identifier, return the JSON decoded value from localStorage.
 * Returns null if the value was not present or could not be parsed.
 */
function getValue(name) {
    var value = localStorage.getItem(name); // value is string or null
    try {
        return JSON.parse(value);
    } catch (exception) {
        console.error('JSON parse failed for key:', name, 'and value:', value);
    }
    return null;
}

/*
 * Given a string identifier, remove the associated value from localStorage.
 */
function removeValue(name) {
    localStorage.removeItem(name);
}