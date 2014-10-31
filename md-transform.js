var parseMarkdown = require('marked');
var path = require('path');
var through2 = require('through2');

module.exports = {
  canTransform: isMarkdown,
  transform: transform
};

/*
 * Transform the given markdown file by parsing the markdown file.
 */
function transform(file) {
  var contents = [];

  return through2(write, flush);

  // Simply collect string fragments of the markdown file.
  function write(data, encoding, callback) {
    var string = data.toString();
    contents.push(string);
    callback();
  }

  // Reconstruct the markdown and then parse it.
  function flush(callback) {
    var string = contents.join('');
    this.push('module.exports = ' + JSON.stringify(parseMarkdown(string)));
    callback();
  }
}

/* Determines if the filetype is markdown. */
function isMarkdown(file) {
  return path.extname(file) === '.md';
}