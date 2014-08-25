var test = require('prova');
var addAttributes = require('../../src/lib/addAttributes');

test('addAttributes', function(t) {
  // Normal Cases: add nothing, add 1 thing, add multiple things
  var obj = {};

  addAttributes(obj, {});
  t.deepEqual(obj, {});

  addAttributes(obj, {a: 'a'});
  t.deepEqual(obj, {a: 'a'});

  addAttributes(obj, {b: 'b'});
  t.deepEqual(obj, {a: 'a', b: 'b'});

  addAttributes(obj, {c: [3], d: function() { return 'd'; }});
  var expected = {a: 'a', b: 'b', c: [3], d: function() { return 'd'; }};
  for (var key1 in obj) {
    if (obj.hasOwnProperty(key1)) {
      t.ok('' + obj[key1] === '' + expected[key1]); // effectively equal
    }
  }

  // We don't replace existing attributes
  addAttributes(obj, {a: 'will not replace'});
  for (var key2 in obj) {
    if (obj.hasOwnProperty(key2)) {
      t.ok('' + obj[key2] === '' + expected[key2]); // effectively equal
    }
  }

  t.end();
});