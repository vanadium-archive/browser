var mercury = require('mercury');
var AttributeHook = require('../../../lib/mercury/attribute-hook');
var insertCss = require('insert-css');
var displayItemDetails = require('./display-item-details');
var makeRPC = require('./make-rpc');
var browseService = require('../../../services/browse-service');
var smartService = require('../../../services/smart-service');
var PaperInputValueEvent =
  require('../../../lib/mercury/paper-input-value-event');
var h = mercury.h;
var css = require('./index.css');
var debug = require('debug')('components:browse:item-details');
var purgeMercuryArray = require('../../../lib/mercury/purgeMercuryArray');

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
     * The details information for each service object.
     * Can include recommended details information.
     * @type {map[string]map[string]string|mercury|float}
     * details information: string or mercury element
     * recommended details information: float
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

    /*
     * List of selected RPC method inputs
     * @type {Array<string>}
     */
    methodInputArguments: mercury.array([]),

    /*
     * List of selected RPC method input suggestions for each input.
     * @type {Array<Array<string>>}
     */
    methodInputArgumentSuggestions: mercury.array([])
  });

  var events = mercury.input([
    'displayItemDetails',
    'tabSelected',
    'methodSelected',
    'methodCalled',
    'methodRemoved',
    'methodCancelled'
  ]);

  wireUpEvents(state, events);

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

  // Only render the selected tab to avoid needless re-rendering.
  var detailsTab, methodsTab;
  if (state.selectedTabIndex === 0) {
    detailsTab = renderDetailsTab(state, events);
    methodsTab = '';
  } else {
    detailsTab = '';
    methodsTab = renderMethodsTab(state, events);
  }

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
      }, 'Methods')
    ]),
    h('core-selector', {
      'selected': new AttributeHook(state.selectedTabIndex)
    }, [
      h('div.tab-content', detailsTab),
      h('div.tab-content', methodsTab)
    ])
  ];
}

/*
 * The details tab renders details about the current service object.
 * This includes the output of parameterless RPCs made on that object.
 * It also includes recommendations for parameterless RPCs.
 */
function renderDetailsTab(state, events) {
  var typeInfo = browseService.getTypeInfo(state.signature);
  var displayItems = [
    renderFieldItem('Name', (state.itemName || '<root>')),
    renderFieldItem('Type', typeInfo.name, typeInfo.description)
  ];

  // In addition to the Name and Type, render additional service details.
  var details = state.details[state.itemName];
  for (var method in details) {
    if (details.hasOwnProperty(method)) {
      // TODO(alexfandrianto): We may wish to replace this with something less
      // arbitrary. Currently, strings are treated as stringified RPC output.
      // And mercury elements can also be rendered this way.
      // Numbers are treated as the prediction values of recommended items.
      if (typeof details[method] !== 'number') {
        // These details are already known.
        displayItems.push(
          renderFieldItem(
            method,
            details[method]
          )
        );
      } else {
        // These details need to be queried.
        displayItems.push(
          renderFieldItem(
            method,
            renderSuggestRPC(state, events, method, details[method])
          )
        );
      }
    }
  }

  return [
    h('div', displayItems)
  ];
}

/*
 * The methods tab renders the signature, input form, and output area.
 */
function renderMethodsTab(state, events) {
  return h('div', [
    renderSignature(state, events),
    renderMethodInput(state, events),
    renderMethodOutput(state)
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

  /*
   * Pretty prints a method's signature.
   */
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
      'ev-click': mercury.event(events.methodSelected, {
        methodName: name,
        signature: sig
      })
    }, text);
  }
}

/*
 * Renders a input field form for the selected method.
 */
function renderMethodInput(state, events) {
  var method = state.selectedMethod;
  if (method === '') {
    return h('div.method-input', 'No method selected');
  }
  // Display the selected method name
  var methodNameHeader = h('pre', method);

  // Form for filling up the arguments
  var param = state.signature[method];
  var argForm = []; // contains form elements
  var args = state.methodInputArguments; // contains form values
  for (var i = 0; i < param.inArgs.length; i++) {
    // Fill argForm with the relevant form element.
    var argName = param.inArgs[i];
    var suggestions = state.methodInputArgumentSuggestions[i];
    argForm.push(
      renderMethodInputArgument(method, argName, suggestions, args, i)
    );
  }

  // Setup the RUN button.
  var runButton = renderRPCRunButton(
    state,
    events,
    state.selectedMethod,
    param.inArgs.length !== 0,
    args
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
function renderMethodInputArgument(
  methodName, placeholder, suggestions, args, index) {

  // The children are the suggestions for this paper-autocomplete input.
  var children = suggestions.map(function(suggestion) {
    return h('paper-item', { 'label': new AttributeHook(suggestion) });
  });

  var changeEvent = new PaperInputValueEvent(function(data) {
    debug(methodName, placeholder, 'value changed.', data);
    args[index] = data;
  });
  // TODO(alexfandrianto): Remove the inputEvent. It is only here for debug
  // while we are getting used to the paper-autocomplete element.
  var inputEvent = new PaperInputValueEvent(function(data) {
    debug(methodName, placeholder, 'value inputted.', data);
  });

  // TODO(alexfandrianto): Note that Mercury and Polymer create a bug together.
  // Polymer normally captures internal events and stops them from propagating.
  // Unfortunately, Mercury reads and replays events using capturing mode.
  // That means spurious 'change' and 'input' events may appear occasionally.
  var uniqueID = methodName + '|' + index;
  var elem = h('paper-autocomplete.method-input-item.autocomplete', {
    'key': uniqueID, // Enforce element refresh when switching between methods.
    'placeholder': placeholder,
    'value': args[index],
    'ev-change': changeEvent,
    'ev-input': inputEvent,
  }, children);

  return elem;
}

/*
 * Renders the suggestion buttons for an RPC.
 */
function renderSuggestRPC(state, events, methodName, prediction) {
  var buttons = [];
  // The run button is rendered to initiate the RPC.
  buttons.push(renderRPCRunButton(state, events, methodName, false, []));

  // A remove button is rendered to remove the recommendation.
  buttons.push(renderRPCRemoveSuggestButton(state, events, methodName));

  return h('div', buttons);
}

/*
 * Renders a Run button to make RPCs
 */
function renderRPCRunButton(state, events, methodName, hasParams, args) {
  var ev = mercury.event(events.methodCalled, {
    name: state.itemName,
    methodName: methodName,
    hasParams: hasParams,
    signature: state.signature,
    args: args
  });
  var runButton = h(
    'paper-button.method-input-run',
    {
      'href': '#',
      'ev-click': ev,
      'label': 'RUN'
    }
  );
  return runButton;
}

/*
 * Renders a button to remove suggested RPCs.
 */
function renderRPCRemoveSuggestButton(state, events, methodName) {
  var ev = mercury.event(events.methodRemoved, {
    name: state.itemName,
    methodName: methodName,
    signature: state.signature,
    reward: -1
  });
  return h(
    'paper-button.method-input-remove',
    {
      'href': '#',
      'ev-click': ev,
      'label': 'REMOVE'
    }
  );
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
  events.displayItemDetails(displayItemDetails.bind(null, state));
  events.tabSelected(function(data) {
    state.selectedTabIndex.set(data.index);
  });
  events.methodSelected(function(data) {
    state.selectedMethod.set(data.methodName);

    // Clear the current method input arguments and suggestions.
    purgeMercuryArray(state.methodInputArguments);
    purgeMercuryArray(state.methodInputArgumentSuggestions);

    // Then prepare to initial arguments and their suggestions.
    var argNames = data.signature[data.methodName].inArgs;
    var input = {
      methodName: data.methodName,
      signature: data.signature
    };
    argNames.forEach(function(arg) {
      state.methodInputArguments.push(undefined);

      input.argName = arg;
      state.methodInputArgumentSuggestions.push(
        smartService.predict('learner-method-input', input)
      );
    });
  });
  events.methodCalled(makeRPC.bind(null, state));
  events.methodRemoved(function(data) {
    var detail = state.details[data.name];
    delete detail[data.methodName];

    // Log the removed RPC to the smart service.
    smartService.record('learner-autorpc', data);
    state.details.put(data.name, detail);
    smartService.save('learner-autorpc');
  });
  events.methodCancelled(function(data) {
    var detail = state.details[data.name];
    detail[data.methodName] = 0;

    // Log the removed RPC to the smart service.
    smartService.record('learner-autorpc', data);
    state.details.put(data.name, detail);
    smartService.save('learner-autorpc');
  });
}
