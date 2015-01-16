var test = require('prova');
var mercury = require('mercury');
var proxyquire = require('proxyquireify')(require);
var browseComponent = proxyquire('../../../../src/components/browse/index', {
  './item-details/index': itemDetailsComponentMock
});

/*
 * Create mocks for namespaceService used by browseNamespace.
 * One mock that resolves in both glob and signature methods.
 * One mock that rejects in both glob and signature methods.
 */
var mockItem = {
  mountedName: 'mockItem',
  objectName: 'foo/bar/mockItem',
  isGlobbable: true
};

var namespaceServiceMock = {
  isGlobbable: function(name) {
    return Promise.resolve(true);
  },
  search: function(name, globQuery) {
    return Promise.resolve(mercury.array([mockItem]));
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

// Require the browseNamespace using the proxy so mock is used
var browseNamespace =
proxyquire('../../../../src/components/browse/browse-namespace',{
  '../../services/namespace/service': namespaceServiceMock
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

  // Should reset state.namespace if data.namespace is null
  browseNamespace(state, events, {
    namespace: null
  });
  t.equal(state.namespace(), '');

  // Should reset state.namespace if data.namespace is undefined
  browseNamespace(state, events, {});
  t.equal(state.namespace(), '');

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

  // Should reset state.globQuery if data.globQuery is null
  browseNamespace(state, events, {
    globQuery: null
  });
  t.equal(state.globQuery(), '');

  // Should reset state.globQuery if data.globQuery is undefined
  browseNamespace(state, events, {});
  t.equal(state.globQuery(), '');

  // Empty glob keeps it empty in the state but behind the scenes does a '*'
  browseNamespace(state, events, {
    globQuery: ''
  });
  t.equal(state.globQuery(), '');
});
