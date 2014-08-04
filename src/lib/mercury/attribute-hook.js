/*
 * Allows attributes to be set using setAttribute:
 * https://github.com/Raynos/mercury/blob/
 * master/docs/faq.md#how-do-i-update-custom-properties
 */

module.exports = AttributeHook;

function AttributeHook(value) {
  this.value = value;
}

AttributeHook.prototype.hook = function(elem, prop) {
  elem.setAttribute(prop, this.value);
};