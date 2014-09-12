var test = require('prova');
var proxyquire = require('proxyquireify')(require);
var browseComponent = proxyquire('../../../../src/components/browse/index', {
  './item-details/index': itemDetailsComponentMock
});

/*
 * Create mocks for browse-service used by browseNamespace.
 * One mock that resolves in both glob and signature methods.
 * One mock that rejects in both glob and signature methods.
 */
var mockItem = {
  mountedName: 'mockItem',
  name: 'foo/bar/mockItem'
};
var mockItemResult = {
  itemName: 'foo/bar/mockItem',
  mountedName: 'mockItem',
  isGlobbable: true
};
var browseServiceMock = {
  isGlobbable: function(name) {
    return Promise.resolve(true);
  },
  glob: function(name, globQuery) {
    return Promise.resolve([mockItem]);
  }
};
var browseServiceMockWithFailure = {
  isGlobbable: function(name) {
    return Promise.resolve(true);
  },
  glob: function(name, globQuery) {
    return Promise.reject();
  }
};
function itemDetailsComponentMock() {
  return {
    state: {},
    events: {
      displayItemDetails: function(data) {
        return;
      }
    }
  };
}

// Require the browseNamespace using the proxy so mocked browse-service is used
var browseNamespace =
proxyquire('../../../../src/components/browse/browse-namespace',{
  '../../services/browse-service': browseServiceMock
});

var browseNamespaceWithFailure =
proxyquire('../../../../src/components/browse/browse-namespace',{
  '../../services/browse-service': browseServiceMockWithFailure
});

test('Updates state.namespace', function(t) {
  t.plan(4);

  var state = browseComponent().state;
  var events = browseComponent().events;

  // Should update state.namespace with data.namespace
  browseNamespace(state, events, {
    namespace: 'foo/bar'
  });
  t.equal(state.namespace(), 'foo/bar');

  // Should not update state.namespace if data.namespace is null
  browseNamespace(state, events, {
    namespace: null
  });
  t.equal(state.namespace(), 'foo/bar');

  // Should not update state.namespace if data.namespace is undefined
  browseNamespace(state, events, {});
  t.equal(state.namespace(), 'foo/bar');

  // Should update state.namespace if data.namespace is empty string
  browseNamespace(state, events, {
    namespace: ''
  });
  t.equal(state.namespace(), '');
});

test('Updates state.globQuery', function(t) {
  t.plan(4);

  var state = browseComponent().state;
  var events = browseComponent().events;

  // Should update state.globQuery with data.globQuery
  browseNamespace(state, events, {
    globQuery: '**/*'
  });
  t.equal(state.globQuery(), '**/*');

  // Should not update state.globQuery if data.globQuery is null
  browseNamespace(state, events, {
    globQuery: null
  });
  t.equal(state.globQuery(), '**/*');

  // Should not update state.globQuery if data.globQuery is undefined
  browseNamespace(state, events, {});
  t.equal(state.globQuery(), '**/*');

  // Special: Convert empty string to glob everything at this level
  browseNamespace(state, events, {
    globQuery: ''
  });
  t.equal(state.globQuery(), '*');
});

test('Updates state.items', function(t) {
  t.plan(1);

  var state = browseComponent().state;
  var events = browseComponent().events;

  // Should update the items to items returned by glob method call (async)
  browseNamespace(state, events, {
    globQuery: '*',
    namespace: 'foo/bar'
  });

  // The observ-array will callback each time we change state.items
  // Here, we expect exactly 1 changeset to match.
  // We cannot ask all of them to match, so t.deepEquals cannot be used.
  state.items(function(items) {
    if (items[0] === undefined) {
      return;
    }
    var match = true;
    for (var prop in mockItemResult) {
      if (mockItemResult[prop] !== items[0][prop]) {
        match = false;
      }
    }
    if (match) {
      t.pass();
    }
  });
});

test('Updates state.items to empty on failure', function(t) {
  t.plan(1);

  var state = browseComponent().state;
  var events = browseComponent().events;

  // Give initial non-empty value
  state.items.push([mockItem]);

  //Should reset the items to empty on failed glob method call (async)
  browseNamespaceWithFailure(state, events, {
    globQuery: '*',
    namespace: 'foo/bar'
  });

  // The observ-array will callback each time we change state.items
  // Here, we expect a single clear.
  state.items(function(items) {
    t.deepEqual(items, []);
  });
});
