// TODO(aghassemi): Restore when the Polymer bug is fixed.
// https://github.com/veyron/release-issues/issues/1001
// require('./index.js');

module.exports = {
  title: 'Log Viewer',
  canSupport: canSupport,
  render: render
};

function canSupport(name, signature) {
  // Log Viewer supports all names
  return false; //TODO(aghassemi) enable when completed
}

function render(name, signature) {
  var logViewer = document.createElement('viz-plugins-log-viewer');
  logViewer.vname = name;

  return logViewer;
}
