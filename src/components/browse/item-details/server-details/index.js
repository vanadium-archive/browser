// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var insertCss = require('insert-css');

var methodNameToVarHashKey = require('./methodNameToVarHashKey');

var displayServerDetails = require('./display-server-details');

var methodForm = require('../method-form');
var FieldItem = require('../field-item');
var ErrorBox = require('../../../error/error-box');

var css = require('./index.css');
var h = mercury.h;

module.exports = create;
module.exports.render = render;
module.exports.displayServerDetails = displayServerDetails;

/*
 * ServerDetails component provides user interfaces for displaying details for
 * a server such is its resolvedNames, signature, remote blessings, etc..
 */
function create() {
  var state = mercury.varhash({

    /*
     * namespace item to display details for.
     * @see services/namespace/item
     * @type {namespaceitem}
     */
    item: mercury.value(null),

    /*
     * Name of the item.
     * @type {string}
     */
    itemName: mercury.value(''),

    /*
     * Any fatal error while getting the details.
     * Note: will be displayed to user.
     * @type Error
     */
    error: mercury.value(null),

    /*
     * remoteBlessings for the item. []string
     * @type {[]string}
     */
    remoteBlessings: mercury.value(null),

    /*
     * signature for the item. []interface
     * @see services/namespace/interface-util
     * @type {vanadium.vdl.signature}
     */
    signature: mercury.value(null),

    /*
     * An associative array from item names to method outputs.
     * The outputs are in RPC call-order and store render information.
     * @type {map[string]Array<Object>}
     */
    methodOutputs: mercury.varhash(),

    /*
     * Each method form corresponds to an interface in the signature. It is a
     * map from method names to the relevant state used in the method-form
     * component.
     * @type {[]map[string]mercury.struct}
     */
    methodForms: mercury.array([]),

    /*
     * Each method form could be open or closed. All start out open, except
     * for __Reserved, which is explicitly set to closed.
     * @type {[]boolean}
     */
    methodFormsOpen: mercury.array([]),

    /*
     * Whether a loading indicator should be displayed instead of content
     * @type {mercury.value<boolean>}
     */
    showLoadingIndicator: mercury.value(false),

    /*
     * Whether item is bookmarked
     * @type {mercury.value<boolean>}
     */
    isBookmarked: mercury.value(false),

    /*
     * List of resolvedNames for the name.
     * @type {mercury.array<string>}
     */
    resolvedNames: mercury.array([])
  });

  var events = mercury.input([
    'methodForms',
    'toggleMethodForm',
    'toast'
  ]);

  wireUpEvents(state, events);

  // events.methodForms is []events; the index order matches state.methodForms
  // and state.methodFormsOpen.
  events.methodForms = [];

  return {
    state: state,
    events: events
  };
}

/*
 * Render the server details page.
 */
function render(state, events, browseState, navEvents) {
  insertCss(css);
  var content = [];

  // Details can only be shown if there is an item.
  if (state.item) {
    var detailsContent = renderDetailsContent(state, events);
    content.push(detailsContent);
  }

  // The method forms can only be shown under these conditions.
  if (state.item && state.item.hasServer && state.signature) {
    var methodsContent = renderMethodsContent(state, events);
    content.push(methodsContent);
  }

  // Show any errors from getting the details
  if (state.error) {
    var errorTitle = 'Unable to connect to ' + state.itemName;
    content.push(ErrorBox.render(errorTitle, state.error.toString()));
  }

  // Show the loading indicator if it's available.
  if (state.showLoadingIndicator) {
    content.push(h('paper-spinner', {
      attributes: {
        'active': true,
        'aria-label': 'Loading'
      }
    }));
  }

  return content;
}

/*
 * Renders details about the current service object.
 * Assumes that there is a state.item
 * Note: Currently renders in the same tab as renderMethodsContent.
 */
function renderDetailsContent(state, events) {
  var displayItems = [
    renderNameField(state)
  ];
  if (state.item.hasServer) {
    displayItems.push(renderResolvedNamesFieldItem(state));
    if (state.remoteBlessings) {
      displayItems.push(renderRemoteBlessingsFieldItem(state));
    }
  }
  return [
    h('div', displayItems)
  ];
}

/*
 * Renders the ResolvedNames Field Item, a simple listing of the server's
 * resolvedNames.
 */
function renderResolvedNamesFieldItem(state) {
  var resolvedNameDivs;
  if (!state.resolvedNames || state.resolvedNames.length === 0) {
    resolvedNameDivs = [
      h('div', h('span', 'No Resolved Names Found'))
    ];
  } else {
    // Show 1 div per server resolvedName.
    resolvedNameDivs = state.resolvedNames.map(function(resolvedName) {
      return h('div', h('span', resolvedName));
    });
  }
  return FieldItem.render('Service Resolved Names', h('div', {
    attributes: {
      'vertical': true,
      'layout': true
    }
  }, resolvedNameDivs));
}

/*
 * Renders the Full Name field
 */
function renderNameField(state) {
  return FieldItem.render('Full Name', (state.itemName || '<Home>'));
}

/*
 * Renders the Remote Blessings Field Item, a list of the server's blessings.
 * Does not appear until the data has been fetched.
 */
function renderRemoteBlessingsFieldItem(state) {
  var remoteBlessings = state.remoteBlessings;
  var blessingDivs;
  if (remoteBlessings.length === 0) {
    blessingDivs = [
      h('div', h('span', 'No blessings found'))
    ];
  } else {
    // Show 1 div per blessing.
    blessingDivs = remoteBlessings.map(function(blessing) {
      return h('div', h('span', blessing));
    });
  }
  return FieldItem.render('Remote Blessings', h('div', {
    attributes: {
      'vertical': true,
      'layout': true
    }
  }, blessingDivs));
}

/*
 * Renders the method signature forms and the RPC output area.
 * Does not appear until the data has been fetched.
 */
function renderMethodsContent(state, events) {
  var sig = state.signature;
  if (!sig || sig.size === 0) {
    return FieldItem.render('Methods',
      h('div', h('span', 'No method signature')));
  }

  // Render each interface and an output region.
  var content = state.signature.map(function(interface, interfaceIndex) {
    var label = interface.pkgPath + '.' + interface.name;
    var content;
    var open = state.methodFormsOpen[interfaceIndex];
    var options = {
      labelTooltip: interface.doc,
      collapsed: !open,
      callback: events.toggleMethodForm.bind(null, {
        index: interfaceIndex,
        value: !open
      })
    };
    if (!open) {
      content = h('span');
    } else {
      content = renderMethodInterface(state, events, interfaceIndex);
    }
    return FieldItem.render(label, content, options);
  });
  content.push(FieldItem.render('Output', renderMethodOutput(state)));

  return h('div', content);
}

/*
 * Renders each method signature belonging to one of the interfaces of the
 * service. Each form allows RPCs to be made to the associated service.
 */
function renderMethodInterface(state, events, interfaceIndex) {
  var methods = [];

  // Render all the methods in alphabetical order.
  // ES6 Map iterates in the order values were added, so we must sort them.
  var methodNames = [];
  state.signature[interfaceIndex].methods.forEach(
    function(methodData) {
      methodNames.push(methodData.name);
    }
  );
  methodNames.sort().forEach(function(methodName) {
    var methodKey = methodNameToVarHashKey(methodName);
    methods.push(methodForm.render(
      state.methodForms[interfaceIndex][methodKey],
      events.methodForms[interfaceIndex][methodKey]
    ));
  });

  return h('div', methods); // Note: allows 0 method signatures
}

/*
 * Renders the method outputs received by the current service object.
 * Prints each output received in reverse order; most recent is on top.
 */
function renderMethodOutput(state) {
  var outputs = state.methodOutputs[state.item.objectName];
  if (outputs === undefined) {
    return h('div.method-output', h('span', 'No method output'));
  }
  var outputRows = [h('tr', [
    h('th', '#'),
    h('th', 'Method'),
    h('th', 'Output')
  ])];
  for (var i = outputs.length - 1; i >= 0; i--) {
    var output = outputs[i];
    if (output.shouldShow) {
      outputRows.push(
        h('tr', [
          h('td', {
            'scope': 'row'
          }, '' + (i + 1)),
          h('td', h('pre', output.method)),
          h('td', h('pre', output.result))
        ])
      );
    }
  }

  var outputTable = h('table', {
    attributes: {
      'summary': 'Table showing the outputs of methods run on' +
        'the service. The results are shown in reverse order.'
    }
  }, outputRows);
  return h('div.method-output', outputTable);
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.toggleMethodForm(function(data) {
    state.methodFormsOpen.put(data.index, data.value);
  });
}