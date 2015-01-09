var h = require('mercury').h;
var AttributeHook = require('../../../../lib/mercury/attribute-hook');

module.exports = {
  'shouldFormat': shouldFormat,
  'format': format
};

/*
 * Only format if this is an Error
 */
function shouldFormat(input) {
  return input instanceof Error;
}

/*
 * Print the error with a dangerous-looking icon.
 */
function format(input) {
  return h('div', [
    h('core-icon.error', {
      'icon': new AttributeHook('error')
    }),
    h('pre', JSON.stringify(input, null, 2))
  ]);
}