module.exports = onDocumentReady;

function onDocumentReady(cb) {

  // Since we are using third-party polymer to Polyfill for web components.
  // We wait for polymer-ready before triggering document ready.
  document.addEventListener('polymer-ready', cb);
}