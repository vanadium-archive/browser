/*
 * Exposes the Global polymer object asynchronously.
 * This allows Polymer object to be used with browserify and we do not require
 * it to be loaded first as this module will queue up calls.
 */
module.exports = Polymer;

var queue = [];
var loaded = false;

function Polymer(tagName, proto) {
  if (loaded) {
    window.Polymer(tagName, proto);
  } else {
    queue.push({
      tagName: tagName,
      proto: proto
    });
  }
}

document.addEventListener('HTMLImportsLoaded', function() {
  if (loaded) {
    return;
  }

  loaded = true;
  queue.forEach(function(c) {
    window.Polymer(c.tagName, c.proto);
  });

  queue = null;
});