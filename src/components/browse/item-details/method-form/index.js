var mercury = require('mercury');
var h = mercury.h;
var AttributeHook = require('../../../../lib/mercury/attribute-hook');
var PropertyValueEvent =
  require('../../../../lib/mercury/property-value-event');
var debug = require('debug')('components:browse:item-details:method-form');
var smartService = require('../../../../services/smart-service');

module.exports = create;
module.exports.render = render;

/*
 * Create the state and events necessary to render a working method form.
 *
 * TODO(alexfandrianto): Remove the makeRPC parameter since it's a crutch.
 * makeRPC needs a rework before this can actually be done, unfortunately.
 */
function create(itemName, signature, methodName, makeRPC) {
  var param = signature[methodName];

  // Prepare the suggestions and initial value for each method input argument.
  var input = {
    signature: signature,
    methodName: methodName,
  };
  var suggestions = mercury.array([]);
  var args = mercury.array([]);
  for (var i = 0; i < param.inArgs.length; i++) {
    args.push(undefined);

    input.argName = param.inArgs[i];
    suggestions.push(smartService.predict('learner-method-input', input));
  }

  // TODO(alexfandrianto): The smart-service should make predictions here.
  // We should also collect starred invocations from local storage.

  var state = mercury.struct({
    /*
     * Item name to target RPCs against.
     * @type {string}
     */
    itemName: mercury.value(itemName),

    /*
     * The item's signature.
     * @type {Object}
     */
    signature: mercury.value(signature),

    /*
     * Method name for this method form
     * @type {string}
     */
    methodName: mercury.value(methodName),

    /*
     * Argument values that can be used to invoke the methodName RPC.
     * @type {Array<string>}
     */
    args: args,

    /*
     * Set of starred invocations saved by the user. There is no size limit.
     * Each map key is an invocation, a JSON-encoded array of argument values.
     * The value is true iff the item exists.
     * @type {map[string]boolean}
     */
    starred: mercury.varhash(),

    /*
     * Limited list of invocations recommended to the user.
     * Each invocation is a JSON-encoded array of argument values.
     * Order affects rendering priority; some may never be rendered.
     * @type {Array<string>}
     */
    recommended: mercury.array([]),

    /*
     * The autocomplete suggestions for each of this method's inputs.
     * @type {Array<string>}
     */
    suggestions: suggestions,

    /*
     * Whether the method form is in its expanded state or not.
     * @type {boolean}
     */
    expanded: mercury.value(false),

    /*
     * TODO(alexfandrianto): Indicates if the RPC is running.
     * @type {boolean}
     */
    running: mercury.value(false)
  });

  var events = mercury.input([
    'methodStart',  // for parent element to be notified of RPC start
    'methodEnd',    // for parent element to be notified of RPC end and result
    'runAction',    // run the RPC with given arguments
    'expandAction', // show/hide method arguments
    'starAction'    // TODO(alexfandrianto): star/unstar a method invocation
  ]);

  wireUpEvents(state, events, makeRPC);

  return {
    state: state,
    events: events
  };
}

/*
 * Wire up the events for the method form mercury component.
 * Note: Some events are left for the parent component to hook up.
 */
function wireUpEvents(state, events, makeRPC) {
  // TODO(alexfandrianto): Move the makeRPC invocation to this file's runAction.
  // makeRPC currently modifies the output variable (owned by the parent elem),
  // so to prevent a CL blowup, this call is temporarily deferred to the parent.
  events.runAction(makeRPC);

  events.expandAction(function() {
    state.expanded.set(!state.expanded());
  });
  events.starAction(function(args, star) {
    // TODO(alexfandrianto): Handle the star action.
    // Depending on the star boolean, add/remove a star for the given arguments.
  });
}

/*
 * The main rendering function for the method form.
 * Shows the method signature and a run button.
 * If arguments are necessary, then they can be shown when the form is expanded.
 *
 * TODO(alexfandrianto): Pinned and recommended invocations will be added.
 */
function render(state, events) {
  // Display the method name/sig header with expand/collapse/run button.
  var methodNameHeader = renderMethodHeader(state, events);

  // Return immediately if we don't need arguments or haven't expanded.
  if (state.args.length === 0 || !state.expanded) {
    return h('div.method-input', methodNameHeader);
  }

  // TODO(alexfandrianto): Then we have the pinned and recommended things.
  // It's possible that one of these should be shown even when collapsed.

  // Form for filling up the arguments
  var argForm = []; // contains form elements
  for (var i = 0; i < state.args.length; i++) {
    argForm.push(renderMethodInput(state, i));
  }

  // TODO(alexfandrianto): We need to draw a Star/Pin/Favorite button.
  // This event will interact with local storage.

  // Setup the RUN button.
  var runButton = renderRPCRunButton(state, events);

  var footer = h('div.method-input-expanded', [argForm, runButton]);
  return h('div.method-input', [methodNameHeader, footer]);
}

/*
 * Draw the method header: A method signature and either a run or expand button.
 */
function renderMethodHeader(state, events) {
  var labelText = getMethodSignature(state);
  var label = h('div.label', {
    'title': labelText
  }, labelText);

  var runOrExpand;
  if (state.args.length === 0) { // runOrExpand is a run button
    runOrExpand = h('a.drill', {
      'href': '#',
      'title': 'Run ' + state.methodName,
      'ev-click': getRunEvent(state, events, state.args)
    }, h('core-icon.icon', {
      'icon': new AttributeHook('av:play-circle-outline')
    }));
  } else { // runOrExpand is an expand/contract button
    runOrExpand = h('a.drill', {
      'href': '#',
      'title': state.expanded ? 'Hide form' : 'Show form',
      'ev-click': mercury.event(events.expandAction)
    }, h('core-icon.icon', {
      'icon': new AttributeHook(
        state.expanded ? 'expand-less' : 'expand-more'
      )
    }));
  }

  return h('div.item.card', [label, runOrExpand]);
}

/*
 * Extracts a pretty-printed version of the method signature.
 */
function getMethodSignature(state) {
  var methodName = state.methodName;
  var param = state.signature[methodName];
  var text = methodName + '(';
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
  return text;
}

/*
 * Draws a single method argument input using the paper-autocomplete element.
 * Includes a placeholder and suggestions from the internal state.
 */
function renderMethodInput(state, index) {
  var methodName = state.methodName;
  var argName = state.signature[methodName].inArgs[index];
  var suggestions = state.suggestions[index];
  var args = state.args;

  // The children are the suggestions for this paper-autocomplete input.
  var children = suggestions.map(function(suggestion) {
    return h('paper-item', { 'label': new AttributeHook(suggestion) });
  });

  var changeEvent = new PropertyValueEvent(function(data) {
    debug(methodName, argName, 'value changed.', data);
    args[index] = data;
  }, 'value');

  // TODO(alexfandrianto): Note that Mercury and Polymer create a bug together.
  // Polymer normally captures internal events and stops them from propagating.
  // Unfortunately, Mercury reads and replays events using capturing mode.
  // That means spurious 'change' and 'input' events may appear occasionally.
  var elem = h('paper-autocomplete.method-input-item.autocomplete', {
    'key': state.itemName, // Enforce element refresh when switching items
    'placeholder': argName,
    'value': args[index],
    'ev-change': changeEvent
  }, children);

  return elem;
}

/*
 * Draws the RUN button with the RPC run event.
 */
function renderRPCRunButton(state, events) {
  var runButton = h(
    'paper-button.method-input-run',
    {
      'href': '#',
      'ev-click': getRunEvent(state, events, state.args),
      'label': 'RUN',
      'icon': new AttributeHook('av:play-circle-outline')
    }
  );
  return runButton;
}

/*
 * The generic run event for making RPCs. In general, the arguments are taken
 * from state.args, a starred invocation's arguments, or a recommendation's.
 */
function getRunEvent(state, events, args) {
  return mercury.event(events.runAction, {
    name: state.itemName,
    methodName: state.methodName,
    hasParams: state.args.length === 0,
    signature: state.signature,
    args: args
  });
}