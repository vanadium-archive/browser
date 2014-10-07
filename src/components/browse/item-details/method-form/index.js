var mercury = require('mercury');
var h = mercury.h;
var _ = require('lodash');
var guid = require('guid');
var setMercuryArray = require('../../../../lib/mercury/setMercuryArray');
var AttributeHook = require('../../../../lib/mercury/attribute-hook');
var PropertyValueEvent =
  require('../../../../lib/mercury/property-value-event');
var debug = require('debug')('components:browse:item-details:method-form');
var smartService = require('../../../../services/smart-service');
var makeRPC = require('./make-rpc.js');

module.exports = create;
module.exports.render = render;

/*
 * Create the state and events necessary to render a working method form.
 */
function create(itemName, signature, methodName) {
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
    args: mercury.array([]),

    /*
     * Set of starred invocations saved by the user. There is no size limit.
     * An array is used to preserve order.
     * Each value in this array is a JSON-encoded array of argument values.
     * This only contains keys of starred items; unstarred ones are removed.
     * @type {Array<string>}
     */
    starred: mercury.array([]),

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
    inputSuggestions: mercury.array([]),

    /*
     * Whether the method form is in its expanded state or not.
     * @type {boolean}
     */
    expanded: mercury.value(false)
  });

  // Initialize state with reset/refresh functions.
  initializeInputArguments(state);
  refreshInputSuggestions(state);
  // TODO(alexfandrianto): Collect starred invocations from local storage.
  // loadStarredInvocations(state);
  refreshRecommendations(state);

  var events = mercury.input([
    'methodStart',  // for parent element to be notified of RPC start
    'methodEnd',    // for parent element to be notified of RPC end and result
    'runAction',    // run the RPC with given arguments
    'expandAction', // show/hide method arguments
    'starAction'    // TODO(alexfandrianto): star/unstar a method invocation
  ]);

  wireUpEvents(state, events);

  return {
    state: state,
    events: events
  };
}

/*
 * Clear the mercury values related to the input arguments.
 */
function initializeInputArguments(state) {
  var param = state.signature()[state.methodName()];
  var startingArgs = _.range(param.inArgs.length).map(function() {
    return undefined; // Initialize array with undefined values using lodash.
  });
  setMercuryArray(state.args, startingArgs);
}

/*
 * Refresh the suggestions to the input arguments.
 */
function refreshInputSuggestions(state) {
  var param = state.signature()[state.methodName()];
  var input = {
    signature: state.signature(),
    methodName: state.methodName(),
  };
  setMercuryArray(state.inputSuggestions,
    _.map(param.inArgs, function(inArg) {
      // For each argname, predict which inputs should be suggested.
      return smartService.predict('learner-method-input',
        _.assign({argName: inArg}, input)
      );
    })
  );
}

/*
 * Refresh the recommended values in the state.
 */
function refreshRecommendations(state) {
  var input = {
    signature: state.signature(),
    methodName: state.methodName(),
  };
  setMercuryArray(state.recommended,
    smartService.predict('learner-method-invocation', input)
  );
}

/*
 * Wire up the events for the method form mercury component.
 * Note: Some events are left for the parent component to hook up.
 */
function wireUpEvents(state, events) {
  // The run action triggers a start event, RPC call, and end event.
  events.runAction(function(data) {
    // This random value allows us to uniquely identify this RPC.
    var randomID = guid.create();
    events.methodStart({
      runID: randomID
    });

    // Make the RPC, tracking when the method is in-progress or complete.
    makeRPC(data).then(function success(result) {
      events.methodEnd({
        runID: randomID,
        args: data.args,
        result: result
      });
    }, function failure(error) {
      events.methodEnd({
        runID: randomID,
        error: error
      });
    }).catch(function(err) {
      debug('Error handling makeRPC', err);
    });
  });

  events.expandAction(function() {
    state.expanded.set(!state.expanded());
  });
  events.starAction(function(data) {
    // TODO(alexfandrianto): Handle the star action.
    // Depending on the star boolean, add/remove a star for the given arguments.
    var index = state.starred().indexOf(data.argsStr);
    if (data.star && index === -1) { // needs to be added
      state.starred.push(data.argsStr);
    } else if (!data.star && index !== -1) { // needs to be removed
      state.starred.splice(index, 1);
    }

    // TODO(alexfandrianto): Save to local storage?
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

  // Render the stars first, and if there's extra room, the recommendations.
  // TODO(alexfandrianto): Show 1 of the pinned items even when not expanded?
  var recs = renderStarsAndRecommendations(state, events);

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
  return h('div.method-input', [methodNameHeader, recs, footer]);
}

/*
 * Draw the method header: A method signature and either a run or expand button.
 */
function renderMethodHeader(state, events) {
  if (state.args.length === 0) {
    return renderInvocation(state, events);
  }
  var labelText = getMethodSignature(state);
  var label = h('div.label', {
    'title': labelText
  }, labelText);

  var expand = h('a.drill', {
    'href': '#',
    'title': state.expanded ? 'Hide form' : 'Show form',
    'ev-click': mercury.event(events.expandAction)
  }, h('core-icon.icon', {
    'icon': new AttributeHook(
      state.expanded ? 'expand-less' : 'expand-more'
    )
  }));

  return h('div.item.card', [label, expand]);
}

/*
 * Extracts a pretty-printed version of the method signature.
 * args is an optional parameter.
 */
function getMethodSignature(state, args) {
  var methodName = state.methodName;
  var param = state.signature[methodName];
  var text = methodName + '(';
  for (var i = 0; i < param.inArgs.length; i++) {
    var arg = args !== undefined ? args[i] : param.inArgs[i];
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


var SOFTCAP_INVOCATIONS = 3;
/*
 * Renders the starred invocations followed by the recommended ones. Stars are
 * shown with no limit. Recommendations are only shown if there is extra room.
 */
function renderStarsAndRecommendations(state, events) {
  var s = state.starred.map(
    function addStarred(invocation) {
      return renderInvocation(state, events, invocation);
    }
  );

  // Add the remaining recommenations, as long as they are not duplicates and
  // don't exceed the soft cap on the # of invocations shown.
  var remainingRecommendations = Math.min(
    SOFTCAP_INVOCATIONS - s.length,
    state.recommended.length
  );
  var count = 0;
  state.recommended.forEach(function(rec) {
    if (count < remainingRecommendations && state.starred.indexOf(rec) === -1) {
      s.push(renderInvocation(state, events, rec));
      count++;
    }
  });

  return s;
}

/*
 * Render the invocation, showing the method signature and a run button.
 * argsStr is optional and is used for starred and recommended invocations.
 * When given, then the card is smaller and has a star icon.
 */
function renderInvocation(state, events, argsStr) {
  var noArgs = argsStr === undefined;
  var args = noArgs ? [] : JSON.parse(argsStr);
  var labelText = getMethodSignature(state, args);
  var label = h('div.label', {
    'title': labelText
  }, labelText);

  var runButton = h('a.drill', {
    'href': '#',
    'title': 'Run ' + state.methodName,
    'ev-click': getRunEvent(state, events, args)
  }, h('core-icon.icon.run', {
    'icon': new AttributeHook('av:play-circle-outline')
  }));

  if (noArgs) {
    return h('div.item.card', [label, runButton]);
  }

  var starred = state.starred.indexOf(argsStr) !== -1;
  var starButton = h('a.drill', {
    'href': '#',
    'title': starred ? 'Unstar' : 'Star',
    'ev-click': mercury.event(events.starAction, {
      argsStr: argsStr,
      star: !starred
    })
  }, h('core-icon.icon.star', {
    'icon': new AttributeHook(
      starred ? 'star' : 'star-outline'
    )
  }));

  return h('div.item.card.invocation', [starButton, label, runButton]);
}

/*
 * Draws a single method argument input using the paper-autocomplete element.
 * Includes a placeholder and suggestions from the internal state.
 */
function renderMethodInput(state, index) {
  var methodName = state.methodName;
  var argName = state.signature[methodName].inArgs[index];
  var inputSuggestions = state.inputSuggestions[index];
  var args = state.args;

  // The children are the suggestions for this paper-autocomplete input.
  var children = inputSuggestions.map(function(suggestion) {
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
    args: args
  });
}