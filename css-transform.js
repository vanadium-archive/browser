var through2 = require('through2');
var path = require('path');
var rework = require('rework');
var reworkVars = require('rework-vars');
var reworkImport = require('rework-import');

module.exports = {
  canTransform: isCss,
  transform: transform
};

/*
 * Transform the given css file by compiling it with rework.
 */
function transform(file) {
  var contents = [];

  return through2(write, flush);

  // Simply collect string fragments of the css file.
  function write(data, encoding, callback) {
    var string = data.toString();
    contents.push(string);
    callback();
  }

  // Reconstruct the css and then compile it.
  function flush(callback) {
    var string = contents.join('');
    var css = compile(string);
    this.push('module.exports = ' + JSON.stringify(css));
    callback();
  }
}

/* Compiles the given CSS string using rework. */
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

/* Determines if the filetype is css. */
function isCss(file) {
  return path.extname(file) === '.css';
}