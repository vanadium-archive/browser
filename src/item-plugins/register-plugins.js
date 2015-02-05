var pluginRegistry = require('./registry');

// TODO(aghassemi) Do it automatically at build time based on folder structure
// or some other non-code way of registering plugins
var plugins = [
  require('./system/log-viewer/plugin')
];

module.exports = function registerAll() {
  plugins.forEach(function(p) {
    pluginRegistry.register(p);
  });
};