var test = require('prova');
var browseComponent = require('../../../../src/components/browse/index');
var proxyquire = require('proxyquireify')(require);

/*
 * Create mocks for browse-service used by browseNamespace.
 * One mock that resolves in both glob and signature methods.
 * One mock that rejects in both glob and signature methods.
 */
var mockItem = {
  mountedName: 'mockItem',
  name: 'foo/bar/mockItem'
};
var browseServiceMock = {
  glob: function(name, globQuery) {
    return Promise.resolve([mockItem]);
  },
  signature: function(name) {
    return Promise.resolve('signature');
  }
};
var browseServiceMockWithFailure = {
  glob: function(name, globQuery) {
    return Promise.reject();
  },

  signature: function(name) {
    return Promise.reject();
  }
};

// Require the browseNamespace using the proxy so mocked browse-service is used
var browseNamespace =
proxyquire('../../../../src/components/browse/event-handlers/browse-namespace',{
  '../../../services/browse-service': browseServiceMock
});

var browseNamespaceWithFailure =
proxyquire('../../../../src/components/browse/event-handlers/browse-namespace',{
  '../../../services/browse-service': browseServiceMockWithFailure
});

test('Updates state.namespace', function(t) {
  t.plan(4);

  var state = browseComponent().state;

  // Should update state.namespace with data.namespace
  browseNamespace(state, {
    namespace: 'foo/bar'
  });
  t.equal(state.namespace(), 'foo/bar');

  // Should not update state.namespace if data.namespace is null
  browseNamespace(state, {
    namespace: null
  });
  t.equal(state.namespace(), 'foo/bar');

  // Should not update state.namespace if data.namespace is undefined
  browseNamespace(state, {});
  t.equal(state.namespace(), 'foo/bar');

  // Should update state.namespace if data.namespace is empty string
  browseNamespace(state, {
    namespace: ''
  });
  t.equal(state.namespace(), '');
});

test('Updates state.globQuery', function(t) {
  t.plan(4);

  var state = browseComponent().state;

  // Should update state.globQuery with data.globQuery
  browseNamespace(state, {
    globQuery: '**/*'
  });
  t.equal(state.globQuery(), '**/*');

  // Should not update state.globQuery if data.globQuery is null
  browseNamespace(state, {
    globQuery: null
  });
  t.equal(state.globQuery(), '**/*');

  // Should not update state.globQuery if data.globQuery is undefined
  browseNamespace(state, {});
  t.equal(state.globQuery(), '**/*');

  // Should not update state.globQuery if data.globQuery is empty string
  browseNamespace(state, {
    globQuery: ''
  });
  t.equal(state.globQuery(), '**/*');
});

test('Updates state.items', function(t) {
  t.plan(1);

  var state = browseComponent().state;

  // Should update the items to items returned by glob method call (async)
  browseNamespace(state, {
    globQuery: '*',
    namespace: 'foo/bar'
  });
  state.items(function(items) {
    t.deepEqual(items, [mockItem]);
  });
});

test('Updates state.items to empty on failure', function(t) {
  t.plan(1);

  var state = browseComponent().state;

  // Give initial value
  state.items.set([mockItem]);

  //Should reset the items to empty on failed glob method call (async)
  browseNamespaceWithFailure(state, {
    globQuery: '*',
    namespace: 'foo/bar'
  });
  state.items(function(items) {
    t.deepEqual(items, []);
  });

});

test('Updates state.signature', function(t) {
  t.plan(1);

  var state = browseComponent().state;

  // Should update the signature to items returned by glob method call (async)
  browseNamespace(state, {
    globQuery: '*',
    namespace: 'foo/bar'
  });
  state.signature(function(signature) {
    t.equal(signature, 'signature');
  });

});

test('Updates state.signature to empty on failure', function(t) {
  t.plan(1);

  var state = browseComponent().state;

  // Give initial value
  state.signature.set('not-empty');

  // Should reset the signature to empty on failed signature method call (async)
  browseNamespaceWithFailure(state, {
    globQuery: '*',
    namespace: 'foo/bar'
  });
  state.signature(function(sig) {
    t.equal(sig, '');
  });
});