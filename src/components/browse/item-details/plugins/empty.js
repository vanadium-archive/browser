module.exports = {
  'shouldFormat': shouldFormat,
  'format': format
};

/*
 * The input is empty in various cases.
 */
function shouldFormat(input) {
  return input === undefined || input === null || input === '' ||
    (input instanceof Array && input.length === 0);
}

/*
 * Indicate that nothing was there.
 */
function format(input) {
  return '<no data>';
}