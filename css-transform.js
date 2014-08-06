var through2 = require('through2');
var path = require('path');

module.exports = transform;

//TODO(aghassemi) Vanilla CSS for now. Pre-process after switch to Rework
function transform(file) {
  if (path.extname(file) !== '.css') {
    return through2();
  }

  var contents = [];

  return through2(write, flush);

  function write(data, encoding, callback) {
    var string = data.toString();
    contents.push(string);
    callback();
  }

  function flush(callback) {
    var css = contents.join('');
    this.push('module.exports = ' + JSON.stringify(css));
    callback();
  }
}