// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var _ = require('lodash');
var uuid = require('uuid');

var makeRPC = require('./make-rpc.js');

var arraySet = require('../../../../lib/arraySet');
var setMercuryArray = require('../../../../lib/mercury/set-mercury-array');
var PropertyValueEvent =
  require('../../../../lib/mercury/property-value-event');

var store = require('../../../../lib/store');

var smartService = require('../../../../services/smart/service');
var getMethodData =
  require('../../../../services/namespace/interface-util').getMethodData;
var hashInterface =
  require('../../../../services/namespace/interface-util').hashInterface;

var log = require('../../../../lib/log')(
  'components:browse:item-details:method-form');

var h = mercury.h;


module.exports = create;
module.exports.render = render;

// While an unlimited # of items are predicted per input, it's a bad idea to
// show them all. Limit to 4 at a time, and rely on filtering to find the rest.
var METHOD_INPUT_MAX_ITEMS = 4;

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
     * The item's interface.
     * @type {interface}
     */
    interface: mercury.value(null),

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
    'displayMethodForm',     // the main event used to prepare the form data
    'methodStart',           // notify parent element of RPC start
    'methodEnd',             // notify parent element of RPC end result
    'runAction',             // run the RPC with given arguments
    'expandAction',          // show/hide method arguments
    'starAction',            // star/unstar a method invocation
    'removeRecommendation',  // remove and reload recommended invocations
    'removeInputSuggestion', // remove and reload input suggestions
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
 * data needs to include "itemName", "interface", and "methodName".
 */
function displayMethodForm(state, events, data) {
  // Set the given data into the state and prepare the method form.
  state.itemName.set(data.itemName);
  state.interface.set(data.interface);
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
  var param = getMethodData(state.interface(), state.methodName());
  var startingArgs = _.range(param.inArgs.length).map(function() {
    return ''; // Initialize array with empty string values using lodash.
  });
  setMercuryArray(state.args, startingArgs);
}

/*
 * Returns a promise that refreshes the suggestions to the input arguments.
 */
function refreshInputSuggestions(state) {
  var param = getMethodData(state.interface(), state.methodName());
  var input = {
    interface: state.interface(),
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
 * The keys are of the form STARS|item|interface|method.
 * The corresponding value is an array of invocations.
 */
var starsPrefix = 'STARS';
function constructStarredInvocationKey(state) {
  var parts = [
    starsPrefix,
    state.itemName(),
    hashInterface(state.interface()),
    state.methodName()
  ];
  return parts.join('|');
}

/*
 * Returns a promise that refreshes the recommended values in the state.
 */
function refreshRecommendations(state) {
  var input = {
    interface: state.interface(),
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

  // This event removes the specified recommendation.
  // Afterwards, the recommendations are refreshed.
  events.removeRecommendation(function(args) {
    var input = {
      interface: state.interface(),
      methodName: state.methodName(),
      value: JSON.stringify(args),
      reset: true
    };

    smartService.update('learner-method-invocation', input).then(function() {
      log.debug('Removing method invocation', input);
      return refreshRecommendations(state);
    }).then(function() {
      return events.toast({
        text: 'Removed suggestion: ' + getMethodSignature(state(), args),
        type: 'info'
      });
    }).catch(function(err) {
      var errText = 'Failed to remove suggestion';
      log.error(errText, err);
      events.toast({
        text: errText,
        type: 'error'
      });
    });
  });

  // This event removes the specified input suggestion for an argument.
  // Afterwards, all input suggestions are refreshed.
  events.removeInputSuggestion(function(data) {
    var input = {
      interface: state.interface(),
      methodName: state.methodName(),
      argName: data.argName,
      value: data.arg,
      reset: true
    };

    smartService.update('learner-method-input', input).then(function() {
      log.debug('Removing method input', input);
      return refreshInputSuggestions(state);
    }).catch(function(err) {
      var errText = 'Failed to remove suggestion';
      log.error(errText, err);
      events.toast({
        text: errText,
        type: 'error'
      });
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
    argForm.push(renderMethodInput(state, events, i));
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
  // The tooltip contains the documentation for the method name.
  var methodSig = getMethodData(state.interface, state.methodName);
  var tooltip = methodSig.doc || '<no description>';

  // If the method takes input, add documentation about the input arguments.
  if (methodSig.inArgs.length > 0) {
    tooltip += '\n\nParameters';
    methodSig.inArgs.forEach(function(inArg) {
      tooltip += '\n';
      tooltip += '- ' + inArg.name + ': ' + inArg.type.toString();
      if (inArg.doc) {
        tooltip += '  ' + inArg.doc;
      }
    });
  }

  // If the method returns output, add documentation about the output arguments.
  if (methodSig.outArgs.length > 0) {
    tooltip += '\n\nOutput';
    methodSig.outArgs.forEach(function(outArg) {
      tooltip += '\n';
      tooltip += '- ' + outArg.name + ': ' + outArg.type.toString();
      if (outArg.doc) {
        tooltip += '  ' + outArg.doc;
      }
    });
  }

  return h('core-tooltip.tooltip.method-tooltip', {
    'label': tooltip,
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
      'icon': state.expanded ? 'expand-more' : 'chevron-right'
    }
  }));

  return h('div.item.card', [label, expand]);
}

/*
 * Extracts a pretty-printed version of the method signature.
 * If the method has no input args, print the name
 * If the method does have input args, also show parentheses
 * @args is an optional list whose elements are also printed out.
 */
function getMethodSignature(state, args) {
  var methodName = state.methodName;
  var param = getMethodData(state.interface, methodName);
  var text = methodName;
  var hasArgs = (param.inArgs.length > 0);
  if (hasArgs) {
    text += '(';
  }
  if (args !== undefined) {
    for (var i = 0; i < param.inArgs.length; i++) {
      if (i > 0) {
        text += ', ';
      }
      text += args[i];
    }
  } else if (hasArgs) {
    text += '...';
  }
  if (hasArgs) {
    text += ')';
  }
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
      s.push(renderInvocation(state, events, rec, true));
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
function renderInvocation(state, events, argsStr, recommended) {
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
    'title': starred ? 'Forget Method Call' : 'Save Method Call',
    'ev-click': mercury.event(events.starAction, {
      argsStr: argsStr,
      star: !starred
    })
  }, renderStarIcon(starred));

  var negFeedback;
  if (recommended) {
    negFeedback = h('div.action-bar', h('paper-fab', {
      attributes: {
        'aria-label': 'Remove suggestion',
        'title': 'Remove suggestion',
        'icon': 'clear',
        'mini': true
      },
      'ev-click': events.removeRecommendation.bind(null, args)
    }));
  }

  return h('div.item.card.invocation',
    [starButton, label, runButton, negFeedback]
  );
}

/*
 * Render a method label using labelText.
 */
function makeMethodLabel(labelText) {
  return h('div.label', labelText);
}

/*
 * Draws a single method argument input using the paper-autocomplete element.
 * Includes a placeholder and suggestions from the internal state.
 */
function renderMethodInput(state, events, index) {
  var methodName = state.methodName;
  var inArg = getMethodData(state.interface, state.methodName).inArgs[index];
  var argName = inArg.name;
  var argTypeStr = inArg.type.name || inArg.type.toString();
  var inputSuggestions = state.inputSuggestions[index];
  var args = state.args;

  // The children are the suggestions for this paper-autocomplete input.
  var children = inputSuggestions.map(function(suggestion) {
    return h('paper-item', {
      attributes: {
        // Attach as an attribute for later retrieval
        'input-suggestion': suggestion
      }
    }, suggestion);
  });

  // Event used to update state when the value is changed.
  var changeEvent = new PropertyValueEvent(function(data) {
    log.debug(methodName, argName, 'value changed.', data);
    args[index] = data;
  }, 'value');

  // TODO(alexfandrianto): It may be nice to link feedback between the
  // method-input and method-invocation learners.
  // Event used to remove an input suggestion.
  var removeEvent = function(e) {
    events.removeInputSuggestion({
      argName: argName,
      arg: e.target.getAttribute('input-suggestion')
    });
  };

  // TODO(alexfandrianto): Note that Mercury and Polymer create a bug together.
  // Polymer normally captures internal events and stops them from propagating.
  // Unfortunately, Mercury reads and replays events using capturing mode.
  // That means spurious 'change' and 'input' events may appear occasionally.
  var elem = h('paper-autocomplete.method-input-item.autocomplete', {
    'key': state.itemName, // Enforce element refresh when switching items
    attributes: {
      'label': argName + ' (' + argTypeStr + ')',
      'value': args[index],
      'spellcheck': 'false',
      'maxItems': METHOD_INPUT_MAX_ITEMS
    },
    'ev-change': changeEvent,
    'ev-delete-item': removeEvent
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
      h('span', 'Save')
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
  return h('core-icon.action-icon' + (starred ? '.starred' : ''), {
    attributes: {
      'icon': starred ? 'star' : 'star-outline',
      'alt': starred ? 'saved' : 'recommended'
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
