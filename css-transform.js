var through2 = require('through2');
var path = require('path');
var rework = require('rework');
var reworkVars = require('rework-vars');
var reworkImport = require('rework-import');

module.exports = transform;

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
    var string = contents.join('');
    var css = compile(string);
    this.push('module.exports = ' + JSON.stringify(css));
    callback();
  }
}

/* Compiles the given CSS string using rework */
function compile(string) {
  var css = rework(string)
    .use(reworkImport({
      path: 'src/components'
    }))
    .use(reworkVars())
    .toString({
      compress: true
    });
  return css;
}