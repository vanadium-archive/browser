var test = require('prova');
var _ = require('lodash');
var proxyquire = require('proxyquireify')(require);
var mockLRUCache = require('./mocks/lru-cache');
var installMockVeyronExtension = require('./mocks/veyron-extension');

// 8885 is the expected wspr port to be running for the tests
var veyronConfigForTest = {
  'wspr': 'http://localhost:8885'
};

// Require namespaceService but using test specific mocks and configs
var namespaceService =
  proxyquire('../../../../src/services/namespace/service.js', {
    '../../veyron-config': veyronConfigForTest,
    'lru-cache': function() {
      return mockLRUCache;
    }
  });

// instantiate the mock veyron extension
installMockVeyronExtension();

test('getChildren of default namespace root', function(t) {
  t.plan(9+9);

  var result = namespaceService.getChildren();

  // Wait until we receive the 4 top level items,
  // binaryd, buildd, cottage, house
  var numReturnedChildren;
  result(function(children) {
    numReturnedChildren = children.length;
    if (numReturnedChildren === 4) {
      children = _.sortBy(children, 'mountedName');
      assertBinaryd(children[0]);
      assertHouse(children[3]);
    }
  });

  // 9 assertions
  function assertBinaryd(item) {
    t.equal(item.mountedName, 'binaryd');
    t.equal(item.objectName, 'binaryd');
    t.equal(item.isServer, true);
    t.equal(item.isGlobbable, false);

    assertUnknownServiceTypeInfo(t, item.serverInfo.typeInfo);

    t.ok(item.serverInfo.signature);
  }

  // 9 assertions
  function assertHouse(item) {
    t.equal(item.mountedName, 'house');
    t.equal(item.objectName, 'house');
    t.equal(item.isServer, true);
    t.equal(item.isGlobbable, true);

    t.ok(item.serverInfo.signature);

    assertMounttableServiceTypeInfo(t, item.serverInfo.typeInfo);
  }
});

test('getChildren of cottage/lawn', function(t) {
  t.plan(9+5);

  var result = namespaceService.getChildren('cottage/lawn');

  // Wait until we receive the 3 items,
  // back, front and master-sprinkler come back
  var numReturnedChildren;
  result(function(children) {
    numReturnedChildren = children.length;
    if (numReturnedChildren === 3) {
      children = _.sortBy(children, 'mountedName');
      assertBack(children[0]);
      assertSprinkler(children[2]);
    }
  });

  // 9 assertions
  function assertSprinkler(item) {
    t.equal(item.mountedName, 'master-sprinkler');
    t.equal(item.objectName, 'cottage/lawn/master-sprinkler');
    t.equal(item.isServer, true);
    t.equal(item.isGlobbable, false);

    assertUnknownServiceTypeInfo(t, item.serverInfo.typeInfo);

    t.ok(item.serverInfo.signature);
  }

  // 5 assertions
  function assertBack(item) {
    t.equal(item.mountedName, 'back');
    t.equal(item.objectName, 'cottage/lawn/back');
    t.equal(item.isServer, false);
    t.equal(item.isGlobbable, true);
    t.equal(item.serverInfo, null);
  }
});

test('getChildren of rooted /localhost:8881/house/kitchen', function(t) {
  t.plan(9+9);

  // 8881 is the expected root mounttable port to be running for the tests
  var result = namespaceService.getChildren('/localhost:8881/house/kitchen');

  // Wait until we receive the 2 items, lights and smoke-detector
  var numReturnedChildren;
  result(function(children) {
    numReturnedChildren = children.length;
    if (numReturnedChildren === 2) {
      children = _.sortBy(children, 'mountedName');
      assertLightSwitch(children[0]);
      assertSmokeDetector(children[1]);
      t.end();
    }
  });

  // 9 assertions
  function assertLightSwitch(item) {
    t.equal(item.mountedName, 'lights');
    t.equal(item.objectName, '/localhost:8881/house/kitchen/lights');
    t.equal(item.isServer, true);
    t.equal(item.isGlobbable, false);

    assertUnknownServiceTypeInfo(t, item.serverInfo.typeInfo);

    t.ok(item.serverInfo.signature);
  }

  // 9 assertions
  function assertSmokeDetector(item) {
    t.equal(item.mountedName, 'smoke-detector');
    t.equal(item.objectName, '/localhost:8881/house/kitchen/smoke-detector');
    t.equal(item.isServer, true);
    t.equal(item.isGlobbable, false);

    assertUnknownServiceTypeInfo(t, item.serverInfo.typeInfo);

    t.ok(item.serverInfo.signature);
  }
});

test('glob uses caching', function(t) {
  t.plan(3);

  mockLRUCache.reset();

  namespaceService.glob('house', '*');
  // First time, no cache hit so a get call followed by a set call
  t.notOk(mockLRUCache.lastCallWasCacheHit);

  // Second time, there should have been a cache hit
  namespaceService.glob('house', '*');
  t.ok(mockLRUCache.lastCallWasCacheHit);

  // call glob with same name, different query, there should be no cache hit
  namespaceService.glob('house', 'foo*');
  t.notOk(mockLRUCache.lastCallWasCacheHit);
});

test('getSignature uses caching', function(t) {
  t.plan(3);

  mockLRUCache.reset();

  namespaceService.getSignature('house/alarm').then(function() {
    // First time, no cache hit
    t.notOk(mockLRUCache.lastCallWasCacheHit);
    // Call a second time
    return namespaceService.getSignature('house/alarm');
  }).then(function() {
    // Second time, must be a cache hit
    t.ok(mockLRUCache.lastCallWasCacheHit);
    // Call a different name
    return namespaceService.getSignature('house/kitchen/smoke-detector');
  }).then(function() {
    // Different name, no cache hit
    t.notOk(mockLRUCache.lastCallWasCacheHit);
  });
});

//TODO(aghassemi)
//Tests for:
// Recursive glob
// Glob with some keyword
// Ensuring array is updated when nodes get mounted and unmounted (when we use
// watchGlob)
// makeRPC TODO(alexfandrianto)

/*
 * Test helpers
 */

/*
 * Asserts that a ServiceTypeInfo is of predefined type of Unknown Service.
 * 4 assertions
 */
function assertUnknownServiceTypeInfo(t, typeInfo) {
  t.equal(typeInfo.key, 'veyron-unknown');
  t.equal(typeInfo.typeName, 'Service');
  t.equal(typeInfo.description, null);
  t.ok(typeInfo.icon);
}

/*
 * Asserts that a ServiceTypeInfo is of predefined type of mounttable.
 * 4 assertions
 */
function assertMounttableServiceTypeInfo(t, typeInfo) {
  t.equal(typeInfo.key, 'veyron-mounttable');
  t.equal(typeInfo.typeName, 'Mount Table');
  t.ok(typeInfo.description);
  t.ok(typeInfo.icon);
}
