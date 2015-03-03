var test = require('prova');
var mercury = require('mercury');
var itemDetailsComponent =
require('../../../../../src/components/browse/item-details/index');
var proxyquire = require('proxyquireify')(require);
var ItemTypes = require('../../../../../src/services/namespace/item-types');
/*
 * Create mocks for browse-service used by browseNamespace.
 * One mock that resolves in both glob and signature methods.
 * One mock that rejects in both glob and signature methods.
 */
var mockName = 'foo/bar/mockItem';
var mockItem = {
  mountedName: 'mockItem',
  name: mockName,
  itemType: ItemTypes.intermediary
};
var namespaceServiceMock = {
  getNamespaceItem: function() {
    return Promise.resolve(
      mercury.value(mockItem)
    );
  }
};
var namespaceServiceMockWithFailure = {
  getNamespaceItem: function() {
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

test('Updates state.item', function(t) {

  var component = itemDetailsComponent();
  var state = component.state;
  var events = component.events;

  state.item(function(item) {
    t.deepEqual(item, mockItem);
    t.end();
  });

  // Should update item to mockItem
  displayItemDetails(state, events, {
    name: mockName
  });

});

test('Updates state.item to null on failure', function(t) {

  var component = itemDetailsComponent();
  var state = component.state;
  var events = component.events;

  // Give initial value
  state.item.set(mockItem);

  // Should reset item to null on failed getNamespaceItem method call (async)
  state.item(function(item) {
    t.equal(item, null);
    t.end();
  });

  displayItemDetailsWithFailure(state, events, {
    name: mockName
  });
});
