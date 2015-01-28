var mercury = require('mercury');
var _ = require('lodash');
var uuid = require('uuid');

var makeRPC = require('./make-rpc.js');

var arraySet = require('../../../../lib/arraySet');
var setMercuryArray = require('../../../../lib/mercury/setMercuryArray');
var PropertyValueEvent =
  require('../../../../lib/mercury/property-value-event');

var store = require('../../../../lib/store');

var smartService = require('../../../../services/smart/service');
var hashSignature =
  require('../../../../services/namespace/service').hashSignature;

var log = require('../../../../lib/log')(
  'components:browse:item-details:method-form');

var h = mercury.h;


module.exports = create;
module.exports.render = render;

/*
 * Create the base state and events necessary to render a method form.
 * Call the displayMethodForm event to fill this state with more data.
 */
function create() {
  var state = mercury.varhash({
    /*
     * Item name to target RPCs against.
     * @type {string}
     */
    itemName: mercury.value(''),

    /*
     * The item's signature.
     * @type {Object}
     */
    signature: mercury.value(null),

    /*
     * Method name for this method form
     * @type {string}
     */
    methodName: mercury.value(''),

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

  var events = mercury.input([
    'displayMethodForm',  // the main event used to prepare the form data
    'methodStart',        // for parent element to be notified of RPC start
    'methodEnd',          // for parent element to be notified of RPC end result
    'runAction',          // run the RPC with given arguments
    'expandAction',       // show/hide method arguments
    'starAction',         // star/unstar a method invocation
    'toast'
  ]);
  wireUpEvents(state, events);

  return {
    state: state,
    events: events
  };
}

/*
 * Event handler that sets and prepares data into this form component.
 * data needs to include "itemName", "signature", and "methodName".
 */
function displayMethodForm(state, events, data) {
  // Set the given data into the state and prepare the method form.
  state.itemName.set(data.itemName);
  state.signature.set(data.signature);
  state.methodName.set(data.methodName);
  initializeInputArguments(state);

  // Prepare the remaining state asynchronously.
  refreshInputSuggestions(state).catch(function(err) {
    log.error('Could not get input suggestions for', data.methodName, err);
  });
  loadStarredInvocations(state).catch(function(err) {
    events.toast({
      text: 'Could not load stars for ' + data.methodName,
      type: 'error'
    });
    log.error('Could not load stars for', data.methodName, err);
  });
  refreshRecommendations(state).catch(function(err) {
    log.error('Could not get recommended invocations for',
      data.methodName, err);
  });
}

/*
 * Clear the mercury values related to the input arguments.
 */
function initializeInputArguments(state) {
  var param = state.signature().get(state.methodName());
  var startingArgs = _.range(param.inArgs.length).map(function() {
    return undefined; // Initialize array with undefined values using lodash.
  });
  setMercuryArray(state.args, startingArgs);
}

/*
 * Returns a promise that refreshes the suggestions to the input arguments.
 */
function refreshInputSuggestions(state) {
  var param = state.signature().get(state.methodName());
  var input = {
    signature: state.signature(),
    methodName: state.methodName(),
  };
  return Promise.all(
    // For each argname, predict which inputs should be suggested.
    param.inArgs.map(function(inArg, i) {
      return smartService.predict(
        'learner-method-input',
        _.assign({argName: inArg.name}, input)
      ).then(function(inputSuggestion) {
        state.inputSuggestions.put(i, inputSuggestion);
      });
    })
  );
}

/*
 * Returns a promise that loads starred invocations into the state.
 */
function loadStarredInvocations(state) {
  return store.getValue(constructStarredInvocationKey(state)).then(
    function(result) {
      var invocations = result || [];
      state.put('starred', mercury.array(invocations));
    }
  ).catch(function(err) {
    log.error('Unable to load starred invocations from store', err);
    return Promise.reject(err);
  });
}

/*
 * Returns a promise that update the store with the invocations from the state.
 */
function saveStarredInvocations(state) {
  return store.setValue(
    constructStarredInvocationKey(state),
    state.starred()
  ).catch(function(err) {
    log.error('Unable to save starred invocations', err);
    return Promise.reject(err);
  });
}

/*
 * Given an observed state, produce the storage key.
 * The keys are of the form STARS|item|signature|method.
 * The corresponding value is an array of invocations.
 */
var starsPrefix = 'STARS';
function constructStarredInvocationKey(state) {
  var parts = [
    starsPrefix,
    state.itemName(),
    hashSignature(state.signature()),
    state.methodName()
  ];
  return parts.join('|');
}

/*
 * Returns a promise that refreshes the recommended values in the state.
 */
function refreshRecommendations(state) {
  var input = {
    signature: state.signature(),
    methodName: state.methodName(),
  };
  return smartService.predict('learner-method-invocation', input).then(
    function(recommendations) {
      setMercuryArray(state.recommended, recommendations);
    }
  );
}

/*
 * Wire up the events for the method form mercury component.
 * Note: Some events are left for the parent component to hook up.
 */
function wireUpEvents(state, events) {
  events.displayMethodForm(displayMethodForm.bind(null, state, events));

  // The run action triggers a start event, RPC call, and end event.
  events.runAction(function(data) {
    // This random value allows us to uniquely identify this RPC.
    var randomID = uuid.v4();
    events.methodStart({
      runID: randomID
    });

    // Toast that the RPC is being run.
    events.toast({
      text: 'Running ' + getMethodSignature(state(), data.args)
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
      log.error('Error handling makeRPC', err);
    });
  });

  events.expandAction(function() {
    state.expanded.set(!state.expanded());
  });
  events.starAction(function(data) {
    // Load the user's stars (in case there were other changes).
    loadStarredInvocations(state).then(function() {
      // If there is no argsStr given, compute it now.
      var argsStr = data.argsStr || JSON.stringify(state.args());

      // Depending on the star boolean, add/remove a star for the given args.
      arraySet.set(state.starred, argsStr, data.star);

      // Save the user's star decision.
      return saveStarredInvocations(state);
    }).catch(function(err) {
      events.toast({
        text: 'Error while starring',
        type: 'error'
      });
      log.error('Error while starring invocation', err);
    });
  });
}

/*
 * The main rendering function for the method form.
 * Shows the method signature and a run button.
 * If arguments are necessary, then they can be shown when the form is expanded.
 */
function render(state, events) {
  // Display the method name/sig header with expand/collapse/run button.
  var methodNameHeader = renderMethodHeader(state, events);

  // Return immediately if we don't need arguments or haven't expanded.
  if (state.args.length === 0 || !state.expanded) {
    return makeMethodTooltip(state, h('div.method-input', methodNameHeader));
  }

  // Render the stars first, and if there's extra room, the recommendations.
  // TODO(alexfandrianto): Show 1 of the pinned items even when not expanded?
  var recs = renderStarsAndRecommendations(state, events);

  // Form for filling up the arguments
  var argForm = []; // contains form elements
  for (var i = 0; i < state.args.length; i++) {
    argForm.push(renderMethodInput(state, i));
  }

  // Setup the STAR and RUN buttons.
  var starButton = renderStarUserInputButton(state, events);
  var runButton = renderRPCRunButton(state, events);

  var footer = h('div.method-input-expanded', [argForm, runButton, starButton]);
  return makeMethodTooltip(state,
    h('div.method-input', [methodNameHeader, recs, footer]));
}

/*
 * Wrap the method form with a tooltip.
 */
function makeMethodTooltip(state, child) {
  return h('core-tooltip.tooltip.method-tooltip', {
    'label': state.signature.get(state.methodName).doc || '<no description>',
    'position': 'top'
  }, child);
}

/*
 * Draw the method header: A method signature and either a run or expand button.
 */
function renderMethodHeader(state, events) {
  if (state.args.length === 0) {
    return renderInvocation(state, events);
  }
  var labelText = getMethodSignature(state);
  var label = makeMethodLabel(labelText);

  var expand = h('a.drill', {
    'href': 'javascript:;',
    'title': state.expanded ? 'Hide form' : 'Show form',
    'ev-click': mercury.event(events.expandAction)
  }, h('core-icon.action-icon', {
    attributes: {
      'icon': state.expanded ? 'expand-less' : 'expand-more'
    }
  }));

  return h('div.item.card', [label, expand]);
}

/*
 * Extracts a pretty-printed version of the method signature.
 * args is an optional parameter.
 */
function getMethodSignature(state, args) {
  var methodName = state.methodName;
  var param = state.signature.get(methodName);
  var text = methodName + '(';
  for (var i = 0; i < param.inArgs.length; i++) {
    var arg = '';
    if (args !== undefined) {
      arg = args[i];
    } else {
      arg = param.inArgs[i].name + ' ' + param.inArgs[i].type.toString();
    }
    if (i > 0) {
      text += ', ';
    }
    text += arg;
  }
  text += ')';
  if (param.inStream || param.outStream) {
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
  var label = makeMethodLabel(labelText);

  var runButton = h('a.drill', {
    'href': 'javascript:;',
    'title': 'Run ' + state.methodName,
    'ev-click': getRunEvent(state, events, args)
  }, renderPlayIcon());

  if (noArgs) {
    return h('div.item.card', [label, runButton]);
  }

  var starred = state.starred.indexOf(argsStr) !== -1;
  var starButton = h('a.drill.star', {
    'href': 'javascript:;',
    'title': starred ? 'Unstar' : 'Star',
    'ev-click': mercury.event(events.starAction, {
      argsStr: argsStr,
      star: !starred
    })
  }, renderStarIcon(starred));

  return h('div.item.card.invocation', [starButton, label, runButton]);
}

/*
 * Render a method label using labelText.
 */
function makeMethodLabel(labelText) {
  return h('div.label', {
    'title': labelText
  }, labelText);
}

/*
 * Draws a single method argument input using the paper-autocomplete element.
 * Includes a placeholder and suggestions from the internal state.
 */
function renderMethodInput(state, index) {
  var methodName = state.methodName;
  var argName = state.signature.get(methodName).inArgs[index].name;
  var inputSuggestions = state.inputSuggestions[index];
  var args = state.args;

  // The children are the suggestions for this paper-autocomplete input.
  var children = inputSuggestions.map(function(suggestion) {
    return h('paper-item', suggestion);
  });

  var changeEvent = new PropertyValueEvent(function(data) {
    log.debug(methodName, argName, 'value changed.', data);
    args[index] = data;
  }, 'value');

  // TODO(alexfandrianto): Note that Mercury and Polymer create a bug together.
  // Polymer normally captures internal events and stops them from propagating.
  // Unfortunately, Mercury reads and replays events using capturing mode.
  // That means spurious 'change' and 'input' events may appear occasionally.
  var elem = h('paper-autocomplete.method-input-item.autocomplete', {
    'key': state.itemName, // Enforce element refresh when switching items
    'label': argName,
    'value': args[index],
    'ev-change': changeEvent
  }, children);

  return elem;
}

/*
 * Draws the STAR button with the star event, which saves the user's input.
 */
function renderStarUserInputButton(state, events) {
  var starButton = h(
    'paper-button.secondary',
    {
      'href': 'javascript:;',
      attributes: {
        'raised': 'true'
      },
      'ev-click': mercury.event(events.starAction, {
        star: true
      })
    },
    [
      renderStarIcon(false),
      h('span', 'Star')
    ]
  );
  return starButton;
}

/*
 * Draws the RUN button with the RPC run event with the user's input as args.
 */
function renderRPCRunButton(state, events) {
  var runButton = h(
    'paper-button',
    {
      'href': 'javascript:;',
      attributes: {
        'raised': 'true'
      },
      'ev-click': getRunEvent(state, events, state.args)
    },
    [
      renderPlayIcon(),
      h('span', 'Run')
    ]
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

/*
 * Render a star icon.
 */
function renderStarIcon(starred) {
  return h('core-icon.action-icon', {
    attributes: {
      'icon': starred ? 'star' : 'star-outline',
      'alt': starred ? 'starred' : 'not starred'
    }
  });
}

/*
 * Render a play icon.
 */
function renderPlayIcon() {
  return h('core-icon..action-icon', {
    attributes: {
      'icon': 'av:play-circle-outline',
      'alt': 'run'
    }
  });
}
