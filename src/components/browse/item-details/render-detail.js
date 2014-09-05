/*
 * The plugins listed here are listed in order with highest priority first.
 * Plugins must export functions shouldRender(input) and render(input).
 * The default plugin should always be last.
 */
var plugins = [
  require('./plugins/histogram.js'),
  require('./plugins/default.js')
];

module.exports = renderDetail;

/*
 * Transforms the input into the desired detail output.
 * Various plugins are tested until the correct one is found.
 * With the default plugin, this should always return something.
 */
function renderDetail(input) {
  for (var i = 0; i < plugins.length; i++) {
    if (plugins[i].shouldRender(input)) {
      return plugins[i].render(input);
    }
  }
  console.error('No plugins rendered the detail', input);
}
