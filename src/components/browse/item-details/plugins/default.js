var h = require('mercury').h;

module.exports = {
  'shouldRender': shouldRender,
  'render': render
};

/*
 * By default, always render.
 */
function shouldRender(input) {
  return true;
}

/*
 * By default, the input is returned as prettified JSON.
 */
function render(input) {
  return h('pre', JSON.stringify(input, null, 2));
}