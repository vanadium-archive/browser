var test = require('prova');
var _ = require('lodash');
var proxyquire = require('proxyquireify')(require);
var mockLRUCache = require('./mocks/lru-cache');

// 8885 is the expected wspr port to be running for the tests
// @noCallThru ensures this completely overrdies the original config
// instead of inheriting the properties that are not defined here from
// the original dependency
var veyronConfigForTest = {
  'authenticate': false,
  'wspr': 'http://localhost:8885',
  '@noCallThru': true
};

// Require namespaceService but using test specific mocks and configs
var namespaceService =
  proxyquire('../../../../src/services/namespace/service.js', {
    '../../veyron-config': veyronConfigForTest,
    'lru-cache': function() {
      return mockLRUCache;
    }
  });

test('getChildren of default namespace root', function(t) {
  namespaceService.getChildren().
  then(function assertResult(result) {
    // Wait until we receive the 2 top level items: cottage, house
    assertIsImmutable(t, result);
    var numReturnedChildren;
    result(function(children) {
      numReturnedChildren = children.length;
      if (numReturnedChildren === 2) {
        children = _.sortBy(children, 'mountedName');
        assertCottage(children[0]);
        assertHouse(children[1]);
        t.end();
      }
    });
  }).catch(t.end);

  function assertCottage(item) {
    assertMountedName(t, item, 'cottage');
    assertObjectName(t, item, 'cottage');
    assertIsServer(t, item);
    assertIsGlobbable(t, item);
    assertHasSignature(t, item);
    assertIsAccessible(t, item);
    assertMounttableServiceTypeInfo(t, item);
  }

  function assertHouse(item) {
    assertMountedName(t, item, 'house');
    assertObjectName(t, item, 'house');
    assertIsServer(t, item);
    assertIsGlobbable(t, item);
    assertHasSignature(t, item);
    assertIsAccessible(t, item);
    assertMounttableServiceTypeInfo(t, item);
  }
});

test('getChildren of cottage/lawn', function(t) {
  namespaceService.getChildren('cottage/lawn').
  then(function assertResult(result) {
    // Wait until we receive the 3 items,
    // back, front and master-sprinkler come back
    assertIsImmutable(t, result);
    var numReturnedChildren;
    result(function(children) {
      numReturnedChildren = children.length;
      if (numReturnedChildren === 3) {
        children = _.sortBy(children, 'mountedName');
        assertBack(children[0]);
        assertSprinkler(children[2]);
        t.end();
      }
    });
  }).catch(t.end);

  function assertSprinkler(item) {
    assertMountedName(t, item, 'master-sprinkler');
    assertObjectName(t, item, 'cottage/lawn/master-sprinkler');
    assertIsServer(t, item);
    assertIsNotGlobbable(t, item);
    assertHasSignature(t, item);
    assertIsAccessible(t, item);
    assertUnknownServiceTypeInfo(t, item);
  }

  function assertBack(item) {
    assertMountedName(t, item, 'back');
    assertObjectName(t, item, 'cottage/lawn/back');
    assertIsNotServer(t, item);
    assertIsGlobbable(t, item);
  }
});

test('getChildren of rooted /localhost:8881/house/kitchen', function(t) {

  // 8881 is the expected root mounttable port to be running for the tests
  namespaceService.getChildren('/localhost:8881/house/kitchen').
  then(function assertResult(result) {
  // Wait until we receive the 2 items, lights and smoke-detector
    assertIsImmutable(t, result);
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
  }).catch(t.end);

  function assertLightSwitch(item) {
    assertMountedName(t, item, 'lights');
    assertObjectName(t, item, '/localhost:8881/house/kitchen/lights');
    assertIsServer(t, item);
    assertIsNotGlobbable(t, item);
    assertHasSignature(t, item);
    assertIsAccessible(t, item);
    assertUnknownServiceTypeInfo(t, item);
  }

  function assertSmokeDetector(item) {
    assertMountedName(t, item, 'smoke-detector');
    assertObjectName(t, item, '/localhost:8881/house/kitchen/smoke-detector');
    assertIsServer(t, item);
    assertIsNotGlobbable(t, item);
    assertHasSignature(t, item);
    assertIsAccessible(t, item);
    assertUnknownServiceTypeInfo(t, item);
  }
});

test('getChildren of non-existing mounttable', function(t) {
  // Should get an error
  namespaceService.getChildren('/DoesNotExist:666/What/Ever').
  then(function shouldNotGetResult(result){
    t.fail('Should have returned an error instead of result');
    t.end();
  }).
  catch(function assertThereIsError(err) {
    t.ok(err, 'globbing non-existing mounttable correctly returns error');
    t.end();
  });
});

test('glob uses caching', function(t) {
  mockLRUCache.reset();

  namespaceService.glob('house', '*').
  then(function assertNoCacheHit() {
    t.notOk(mockLRUCache.wasCacheHit('house/*'),
      'first glob call is not a cache hit');

    // Call second time, there should have been a cache hit
    return namespaceService.glob('house', '*');
  }).then( function assertCacheHit() {
    t.ok(mockLRUCache.wasCacheHit('house/*'),
      'second glob call is a cache hit');

    // Call glob with same name, different query
    return namespaceService.glob('house', 'foo*');
  }).then(function assertNoCacheHit() {
    t.notOk(mockLRUCache.wasCacheHit('house/foo*'),
      'third glob call with different query is not a cache hit');
    t.end();
  }).catch(t.end);
});

test('getSignature uses caching', function(t) {
  mockLRUCache.reset();

  namespaceService.getSignature('house/alarm').then(function() {
    t.notOk(mockLRUCache.wasCacheHit('house/alarm'),
      'first getSignature call is not a cache hit');
    // Call a second time
    return namespaceService.getSignature('house/alarm');
  }).then(function() {
    t.ok(mockLRUCache.wasCacheHit('house/alarm'),
      'second getSignature call is a cache hit');
    // Call a different name
    return namespaceService.getSignature('house/kitchen/smoke-detector');
  }).then(function() {
    t.notOk(mockLRUCache.wasCacheHit('house/kitchen/smoke-detector'),
      'third getSignature call to a different name is not a cache hit');
    t.end();
  }).catch(t.end);
});

//TODO(aghassemi)
//Tests for:
// Recursive glob
// Glob with some keyword
// Ensuring array is updated when nodes get mounted and unmounted (when we use
// watchGlob)

// Make RPC: good inputs => no error
var okRPCs = {
  'no input':     ['house/alarm', 'status', []],
  'bool input':   ['house/living-room/lights', 'flipSwitch', [true]],
  'int input':    ['cottage/smoke-detector', 'sensitivity', [2]],
  'float input':  ['house/alarm', 'delayArm', [2.5]],
  'string input': ['cottage/pool/speaker', 'playSong', ['Happy Birthday']],
  'slice input':  ['house/master-bedroom/speaker', 'addSongs', [['A', 'B']]],
  '2+ inputs':    ['cottage/pool/heater', 'start', [70, 5]],
};

_.forOwn(okRPCs, function run(params, inputType) {
  test(
    'makeRPC accepts good input - ' + inputType,
    testMakeRPCNoError.bind(null, params)
  );
});

// Make RPC: bad inputs => error
var badRPCs = {
  'no service':    ['mansion/smoke-detector', 'status', []],
  'no method':     ['cottage/pool/speaker', 'status', []],
  'no input':      ['cottage/lights','flipSwitch', null],
  'bad type':      ['cottage/lights','flipSwitch', ['notBool']],
  'lacks input':   ['cottage/pool/heater','start', [80]],
  'invalid input': ['house/living-room/blast-speaker','playSong', ['notThere']]
};

_.forOwn(badRPCs, function run(params, inputType) {
  test(
    'makeRPC errors on bad input - ' + inputType,
    testMakeRPCHasError.bind(null, params)
  );
});

// Make RPC: outputs have the expected # of outputs
test('makeRPC returns output properly', function(t) {
  namespaceService.makeRPC('cottage/alarm', 'panic', []).then(
    function got0Outputs(res) { // 0 outputs: has [] as a result.
      t.ok(res instanceof Array && res.length === 0, '0 outputs => []');

      return namespaceService.makeRPC('house/alarm', 'status', []);
    }
  ).then( // 1 output: (Non-array/slice output) is not an Array.
    function got1Output(res) {
      t.notOk(res instanceof Array, '1 output => not an Array');

      return namespaceService.makeRPC('cottage/smoke-detector', 'test', []);
    }
  ).then( // 1 output: Delayed return. Also not an array.
    function got1OutputDelayed(res) {
      t.notOk(res instanceof Array, '1 output => not an Array');

      return namespaceService.makeRPC('cottage/pool/heater', 'status', []);
    }
  ).then( // 2 outputs: Is an Array of the correct length.
    function got2Outputs(res) {
      var ok = res instanceof Array && res.length === 2;
      t.ok(ok, '2 outputs => length 2 Array');
      t.end();
    }
  ).catch(t.end);
});

/*
 * Test helpers
 */

function assertMountedName(t, item, val) {
  t.ok(item.mountedName, item.mountedName + ': has a mounted name');
  t.equal(item.mountedName, val, item.mountedName + ': mounted name matches');
}

function assertObjectName(t, item, val) {
  t.ok(item.objectName, item.mountedName + ': has an object name');
  t.equal(item.objectName, val, item.mountedName  + ': object name matches');
}

function assertIsServer(t, item) {
  t.equal(item.isServer, true, item.mountedName  +': is a server');
  t.ok(item.serverInfo, item.mountedName  +': has server info');
}

function assertIsNotServer(t, item) {
  t.equal(item.isServer, false, item.mountedName  +': is not a server');
  t.notOk(item.serverInfo, item.mountedName  +': does not have server info');
}

function assertIsGlobbable(t, item) {
  t.equal(item.isGlobbable, true, item.mountedName  +': is globbable');
}

function assertIsNotGlobbable(t, item) {
  t.equal(item.isGlobbable, false, item.mountedName  +': is not globbable');
}

function assertHasSignature(t, item) {
  t.ok(item.serverInfo.signature, item.mountedName  +': has a signature');
}

function assertIsAccessible(t, item) {
  t.ok(item.serverInfo.isAccessible, item.mountedName  +': is accessible');
}

function assertIsImmutable(t, observable) {
  t.ok(observable.set === undefined, 'is immutable');
}

/*
 * Asserts that a ServiceTypeInfo is of predefined type of Unknown Service.
 */
function assertUnknownServiceTypeInfo(t, item) {
  var typeInfo = item.serverInfo.typeInfo;
  t.equal(typeInfo.key, 'veyron-unknown',
    item.mountedName + ': unknown type info has the right key');

  t.equal(typeInfo.typeName, 'Service',
    item.mountedName + ': unknown type info has the type name');

  t.equal(typeInfo.description, null,
    item.mountedName + ': unknown type info does not have description');

  t.ok(typeInfo.icon,
    item.mountedName + ': unknown type info has an icon');
}

/*
 * Asserts that a ServiceTypeInfo is of predefined type of mounttable.
 */
function assertMounttableServiceTypeInfo(t, item) {
  var typeInfo = item.serverInfo.typeInfo;
  t.equal(typeInfo.key, 'veyron-mounttable',
    item.mountedName + ': mounttable type info has the right key');

  t.equal(typeInfo.typeName, 'Mount Table',
    item.mountedName + ': mounttable type info has the type name');

  t.ok(typeInfo.description,
    item.mountedName + ': mounttable type info has a description');

  t.ok(typeInfo.icon,
    item.mountedName + ': mounttable type info has an icon');
}

/*
 * Runs a test to ensure the makeRPC call terminates without error.
 */
function testMakeRPCNoError(args, t) {
  namespaceService.makeRPC.apply(null, args).then(function(result) {
    t.pass('completed without error');
    t.end();
  }).catch(function(err) {
    t.fail('should not have returned an error');
    t.end();
  });
}

/*
 * Runs a test to ensure the makeRPC call terminates with an error.
 */
function testMakeRPCHasError(args, t) {
  namespaceService.makeRPC.apply(null, args).then(function(result) {
    t.fail('should not have completed without error');
    t.end();
  }).catch(function(err) {
    t.pass('correctly returned an error');
    t.end();
  });
}