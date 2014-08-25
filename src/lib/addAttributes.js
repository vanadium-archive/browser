module.exports = addAttributes;

/*
 * Helper function to add additional attributes to an object.
 * Does not replace existing attributes if already present.
 */
function addAttributes(obj, attrs) {
  for (var key in attrs) {
    if (attrs.hasOwnProperty(key) && !obj.hasOwnProperty(key)) {
      obj[key] = attrs[key];
    }
  }
}