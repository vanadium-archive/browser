var mercury = require('mercury');
var AttributeHook = require('../../../lib/mercury/attribute-hook');
var insertCss = require('insert-css');
var displayItemDetails = require('./display-item-details');
var h = mercury.h;
var css = require('./index.css');
var methodNameToVarHashKey = require('./methodNameToVarHashKey.js');
var methodForm = require('./method-form/index.js');

module.exports = create;
module.exports.render = render;

/*
 * ItemDetails component provides user interfaces for displaying details for
 * a browse item such is its type, signature, etc.
 */
function create() {
  var state = mercury.varhash({

    /*
     * namespace item to display details for
     * @see services/namespace/item
     * @type {namespaceitem}
     */
    item: mercury.value(null),

    /*
     * Which tab to display; 0 is for service details
     * TODO(alexfandrianto): Once we have more info to display, add more tabs.
     * We are currently combining service details, methods, and outputs.
     * TODO(alexfandrianto): Use an enum instead of a comment to clarify the
     * mapping between tab name and tab index.
     * @type {integer}
     */
    selectedTabIndex: mercury.value(0),

    /*
     * An associative array from item names to method outputs.
     * The outputs are in RPC call-order and store render information.
     * @type {map[string]Array<Object>}
     */
    methodOutputs: mercury.varhash(),

    /*
     * The method form has information for each service object. It maps method
     * names to the relevant state used in the renderMethod module.
     * @type {map[string]mercury.struct}
     */
    methodForm: mercury.varhash(),

    /*
     * Whether a loading indicator should be displayed instead of content
     * @type {mercury.value<boolean>}
     */
    showLoadingIndicator: mercury.value(false)
  });

  var events = mercury.input([
    'displayItemDetails',
    'tabSelected',
    'methodForm',
    'toast'
  ]);

  wireUpEvents(state, events);
  events.methodForm = mercury.varhash();

  return {
    state: state,
    events: events
  };
}

/*
 * Render the item details page, which includes tabs for details and methods.
 */
function render(state, events) {
  insertCss(css);

  var tabContent;

  if(state.showLoadingIndicator) {
    tabContent = h('paper-spinner', {
      'active': new AttributeHook(true),
      'aria-label': new AttributeHook('Loading')
    });
  } else if(state.item) {
    var detailsContent = renderDetailsContent(state, events);

    var methodsContent;
    if (state.item.isServer && state.item.serverInfo.isAccessible) {
      methodsContent = renderMethodsContent(state, events);
    }

    tabContent = [detailsContent, methodsContent];
  }

  return [h('paper-tabs.tabs', {
      'selected': new AttributeHook(state.selectedTabIndex),
      'noink': new AttributeHook(true)
    }, [
      h('paper-tab.tab', {
        'ev-click': mercury.event(events.tabSelected, {
          index: 0
        })
      }, 'Service Details')
    ]),
    h('core-selector', {
      'selected': new AttributeHook(state.selectedTabIndex)
    }, [
      h('div.tab-content', tabContent),
    ])
  ];
}

/*
 * Renders details about the current service object.
 * Note: Currently renders in the same tab as renderMethodsContent.
 */
function renderDetailsContent(state, events) {
  var item = state.item;
  var typeName;
  var typeDescription;
  if (item.isServer) {
    typeName = item.serverInfo.typeInfo.typeName;
    typeDescription = item.serverInfo.typeInfo.description;
  } else {
    typeName = 'Intermediary Name';
  }
  var displayItems = [
    renderFieldItem('Name', (item.objectName || '<root>')),
    renderFieldItem('Type', typeName, typeDescription)
  ];

  return [
    h('div', displayItems)
  ];
}

/*
 * Renders the method signature forms and the RPC output area.
 * Note: Currently renders in the same tab as renderDetailsContent.
 */
function renderMethodsContent(state, events) {
  return h('div', [
    renderFieldItem('Methods', renderMethodSignatures(state, events)),
    renderFieldItem('Output', renderMethodOutput(state))
  ]);
}

/*
 * Renders each method signature with associated form for entering inputs and
 * making RPCs to the associated service.
 */
function renderMethodSignatures(state, events) {
  var sig = state.item.serverInfo.signature;
  if (!sig) {
    return h('div', 'No method signature');
  }

  var methods = [];

  // Render all the methods in alphabetical order.
  // ES6 Map iterates in the order values were added, so we must sort them.
  var methodNames = [];
  sig.forEach(function(methodData, methodName) {
    methodNames.push(methodName);
  });
  methodNames.sort().forEach(function(methodName) {
    var methodKey = methodNameToVarHashKey(methodName);
    methods.push(methodForm.render(
        state.methodForm[methodKey],
        events.methodForm[methodKey]
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
    return h('div.method-output', 'No method output');
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
    'summary': new AttributeHook('Table showing the outputs of methods run' +
      'on the service. The results are shown in reverse order.')
  }, outputRows);
  return h('div.method-output', outputTable);
}

/*TODO(aghassemi) make a web component for this*/
function renderFieldItem(label, content, tooltip) {
  var hlabel = h('h4', label);
  if (tooltip) {
    // If there is a tooltip, wrap the content in it
    content = h('core-tooltip.tooltip', {
      'label': new AttributeHook(tooltip),
      'position': 'right'
    }, content);
  }

  return h('div.field', [
    h('h4', hlabel),
    h('div.content', content)
  ]);
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.displayItemDetails(displayItemDetails.bind(null, state, events));
  events.tabSelected(function(data) {
    state.selectedTabIndex.set(data.index);
  });
}