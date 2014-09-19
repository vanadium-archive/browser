var histogram = require('bars');
var h = require('mercury').h;

module.exports = {
  'shouldFormat': shouldFormat,
  'format': format
};

/*
 * Format if the appropriate histogram fields are present.
 * TODO(alexfandrianto): Negotiate a better way of identifying histogram data.
 */
function shouldFormat(input) {
  return input.count !== undefined && input.sum !== undefined &&
    input.buckets !== undefined;
}

/*
 * The histogram is formatted with bars (a fork of ascii-histogram).
 * TODO(alexfandrianto): Consider using a prettier formatting package.
 */
function format(input) {
  var histData = {};
  input.buckets.forEach(function(obj) {
    histData[obj.lowBound] = obj.count;
  });
  return h('pre', histogram(histData, { bar: '*', width: 20 }));
}