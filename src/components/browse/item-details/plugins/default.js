module.exports = {
  'shouldFormat': shouldFormat,
  'format': format
};

/*
 * By default, always format.
 */
function shouldFormat(input) {
  return true;
}

/*
 * By default, the input is returned as prettified JSON.
 */
function format(input) {
  return JSON.stringify(input, null, 2);
}