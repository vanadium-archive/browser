var test = require('prova');
var itemDetailsComponent =
require('../../../../../src/components/browse/item-details/index');
var proxyquire = require('proxyquireify')(require);

/*
 * Create mocks for browse-service used by browseNamespace.
 * One mock that resolves in both glob and signature methods.
 * One mock that rejects in both glob and signature methods.
 */
var mockName = 'veyron/library';
var mockItem = {
  mountedName: 'mockItem',
  name: 'foo/bar/mockItem'
};
var namespaceServiceMock = {
  isGlobbable: function(name) {
    return Promise.resolve(true);
  },
  search: function(name, globQuery) {
    return Promise.resolve([mockItem]);
  },
  getSignature: function(name) {
    return Promise.resolve('signature');
  }
};
var namespaceServiceMockWithFailure = {
  isGlobbable: function(name) {
    return Promise.resolve(true);
  },
  search: function(name, globQuery) {
    return Promise.reject();
  },
  getSignature: function(name) {
    return Promise.reject();
  }
};

// Require the browseNamespace using the proxy so mocked browse-service is used
var displayItemDetails =
proxyquire(
  '../../../../../src/components/browse/item-details/display-item-details',
  { '../../../services/namespace/service': namespaceServiceMock }
);

var displayItemDetailsWithFailure =
proxyquire(
  '../../../../../src/components/browse/item-details/display-item-details',
  { '../../../services/namespace/service': namespaceServiceMockWithFailure}
);

test('Updates state.signature', function(t) {
  t.plan(2);

  var component = itemDetailsComponent();
  var state = component.state;
  var events = component.events;

  state.signature(function(signature) {
    t.equal(signature, 'signature');
  });

  // Additionally, our item details itemName should be updated to match.
  state.itemName(function(name) {
    t.equal(name, mockName);
  });

  // Should update the signature to items returned by glob method call (async)
  displayItemDetails(state, events, {
    name: mockName
  });

});

test('Updates state.signature to empty on failure', function(t) {
  t.plan(1);

  var component = itemDetailsComponent();
  var state = component.state;
  var events = component.events;

  // Give initial value
  state.signature.set('not-empty');

  // Should reset the signature to empty on failed signature method call (async)
  state.signature(function(signature) {
    t.equal(signature, '');
  });

  displayItemDetailsWithFailure(state, events, {
    name: mockName
  });
});
