var test = require('prova');
var store = require('../../src/lib/local-storage');

test('local-storage get', function(t) {
  // A key not present in the store is null.
  t.deepEqual(store.getValue('not in store yet'), null);

  t.end();
});

test('local-storage set=>get', function(t) {
  // Simple string is successfully recovered.
  var value = 'potato soup';
  store.setValue('key1', value);
  t.deepEqual(store.getValue('key'), value);

  // Simple object is successfully recovered.
  var object = { attribute: 'yellow' };
  store.setValue('key2', object);
  t.deepEqual(store.getValue('key2'), object);

  // But note that functions cannot be unparsed!
  var f = function() { return 'cannot be saved'; };
  store.setValue('key3', f);
  t.deepEqual(store.getValue('key3'), null);

  // Object methods are likewise not included.
  var hasMethod = { a: 'survives', f: function() { return 'disappears'; }};
  var lostMethod = { a: 'survives'};
  store.setValue('key4', hasMethod);
  t.deepEqual(store.getValue('key4'), lostMethod);

  t.end();
});

test('local-storage setA=>setB=>get', function(t) {
  // The last value set wins...
  var key = 'key1';
  var key2 = 'key2';
  var value = 'artificial flavors';
  var object = { attribute: 'organic' };
  store.setValue(key, value);
  store.setValue(key, object);
  t.deepEqual(store.getValue(key), object);

  // ...regardless of the values stored.
  store.setValue(key2, object);
  store.setValue(key2, value);
  t.deepEqual(store.getValue(key2), value);

  t.end();
});

test('local-storage set=>remove=>get', function(t) {
  // A removed key will have no value in the store.
  var key = 'will be removed';
  var value = 'not null';
  store.setValue(key, value);
  store.removeValue(key);
  t.deepEqual(store.getValue(key), null);
  t.end();
});

test('local-storage remove=>set=>get', function(t) {
  // A removed key is not permanent; it can be set to again.
  var key = 'will be removed and set again';
  var value = 'not null';
  store.removeValue(key);
  store.setValue(key, value);
  t.deepEqual(store.getValue(key), value);
  t.end();
});