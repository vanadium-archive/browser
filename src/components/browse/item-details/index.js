var mercury = require('mercury');
var AttributeHook = require('../../../lib/mercury/attribute-hook');
var insertCss = require('insert-css');
var displayItemDetails = require('./display-item-details');
var makeRPC = require('./make-rpc');
var browseService = require('../../../services/browse-service');
var PaperInputValueEvent =
  require('../../../lib/mercury/paper-input-value-event');
var h = mercury.h;
var css = require('./index.css');

module.exports = create;
module.exports.render = render;

/*
 * ItemDetails component provides user interfaces for displaying details for
 * a browse item such is its type, signature, etc.
 */
function create() {

  var state = mercury.struct({
    /*
     * Item name to display settings for
     * @type {string}
     */
    itemName: mercury.value(''),

    /*
     * Method signature for the name, if pointing to a server
     * @type {Object}
     */
    signature: mercury.value(null),

    /*
     * Which tab to display; 0 is Details, 1 is Methods
     * @type {integer}
     */
    selectedTabIndex: mercury.value(0),

    /*
     * The details information for this service.
     * @type {map[string]string}
     */
    details: mercury.varhash(),

    /*
     * Method name currently selected for the RPC input form.
     * @type {string}
     */
    selectedMethod: mercury.value(''),

    /*
     * List of RPC method outputs
     * @type {Array<string>}
     */
    methodOutputs: mercury.array([]),
  });

  var events = mercury.input([
    'displayItemDetails',
    'tabSelected',
    'methodSelected',
    'methodCalled',
  ]);

  wireUpEvents(state, events);

  return {
    state: state,
    events: events
  };
}

function render(state, events) {
  insertCss(css);
  return [h('paper-tabs.tabs', {
      'selected': new AttributeHook(state.selectedTabIndex),
      'noink': new AttributeHook(true)
    }, [
      h('paper-tab.tab', {
        'ev-click': mercury.event(events.tabSelected, {
          index: 0
        })
      }, 'Details'),
      h('paper-tab.tab', {
        'ev-click': mercury.event(events.tabSelected, {
          index: 1
        })
      }, 'Methods'),
    ]),
    h('core-selector', {
      'selected': new AttributeHook(state.selectedTabIndex)
    }, [
      h('div.tab-content', renderDetailsTab(state)),
      h('div.tab-content', renderMethodsTab(state, events))
    ])
  ];
}

/*
 * The details tab renders details about the current service object.
 * This includes the output of parameterless RPCs made on that object.
 */
function renderDetailsTab(state) {
  var typeInfo = browseService.getTypeInfo(state.signature);
  var displayItems = [
    renderFieldItem('Name', (state.itemName || '<root>')),
    renderFieldItem('Type', typeInfo.name, typeInfo.description),
  ];

  // In addition to the Name and Type, render additional service details.
  var details = state.details;
  for (var method in details[state.itemName]) {
    if (details[state.itemName].hasOwnProperty(method)) {
      displayItems.push(
        renderFieldItem(
          method,
          details[state.itemName][method]
        )
      );
    }
  }

  return [
    h('div', displayItems),
  ];
}

/*
 * The methods tab renders the signature, input form, and output area.
 */
function renderMethodsTab(state, events) {
  return h('div', [
    renderSignature(state, events),
    renderMethodInput(state, events),
    renderMethodOutput(state),
  ]);
}

/*
 * Renders the signature of the current service object.
 */
function renderSignature(state, events) {
  var methods = [];
  var sig = state.signature;
  for (var m in sig) {
    if (sig.hasOwnProperty(m)) {
      methods.push(renderMethod(m, sig[m]));
    }
  }

  if (methods.length > 0) {
    return h('div.signature', methods);
  } else {
    return h('div.empty', 'No method signature');
  }

  function renderMethod(name, param) {
    var text = name + '(';
    for (var i = 0; i < param.inArgs.length; i++) {
      var arg = param.inArgs[i];
      if (i > 0) {
        text += ',';
      }
      text += arg;
    }
    text += ')';
    if (param.isStreaming) {
      text += ' - streaming';
    }
    return h('pre', {
      'ev-click': mercury.event(events.methodSelected, { methodName: name })
    }, text);
  }
}

/*
 * Renders a input field form for the selected method.
 */
function renderMethodInput(state, events) {
  if (state.selectedMethod === '') {
    return h('div.method-input', 'No method selected');
  }
  // Display the selected method name
  var methodNameHeader = h('pre', state.selectedMethod);

  // Form for filling up the arguments
  var param = state.signature[state.selectedMethod];
  var argForm = []; // contains form elements
  var args = []; // contains form values
  for (var i = 0; i < param.inArgs.length; i++) {
    // Prefill args with undefined
    args.push(undefined);

    // Fill argForm with the relevant form element.
    argForm.push(renderMethodInputArgument(param.inArgs[i], args, i));
  }

  // Setup the button click event for the RUN button.
  var ev = mercury.event(events.methodCalled, {
    name: state.itemName,
    methodName: state.selectedMethod,
    hasParams: param.inArgs.length !== 0,
    signature: state.signature,
    args: args,
  });
  var runButton = h(
    'paper-button.method-input-run',
    {
      'href': '#',
      'ev-click': ev
    },
    'RUN'
  );

  return h('div.method-input', [methodNameHeader, argForm, runButton]);
}

/*
 * Renders the method outputs received by the current service object.
 */
function renderMethodOutput(state) {
  if (state.methodOutputs.length === 0) {
    return h('div.method-output', 'No method output');
  }
  var outputs = state.methodOutputs.map(function(output) {
    return h('pre', output);
  });
  return h('div.method-output', outputs);
}

/*
 * Renders an input element whose change events modify the given args array at
 * the specified index. The placeholder is generally an argument name.
 */
function renderMethodInputArgument(placeholder, args, index) {
  var changeEvent = new PaperInputValueEvent(function(data) {
    args[index] = data;
  });
  var elem = h('paper-input.method-input-item', {
    'placeholder': placeholder,
    'ev-change': changeEvent
  });
  return elem;
}

/*TODO(aghassemi) make a web component for this*/
function renderFieldItem(label, content, tooltip) {

  var hlabel = h('h4', label);
  if (tooltip) {
    // If there is a tooltip, wrap the content in it
    content = h('core-tooltip.tooltip', {
      'label': new AttributeHook(tooltip),
      'position': 'right',
    }, content);
  }

  return h('div.field', [
    h('h4', hlabel),
    h('div.content', content)
  ]);
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.displayItemDetails(displayItemDetails.bind(null, state));
  events.tabSelected(function(data) {
    state.selectedTabIndex.set(data.index);
  });
  events.methodSelected(function(data) {
    state.selectedMethod.set(data.methodName);
  });
  events.methodCalled(makeRPC.bind(null, state));
}