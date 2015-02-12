var h = require('mercury').h;

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
  var error;
  if (input.message) {
    error = input.message;
  } else {
    error = input.toString();
  }
  return h('div', [
    h('core-icon.error', {
      attributes: {
        'icon': 'error'
      }
    }),
    h('pre', error)
  ]);
}
