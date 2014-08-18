var mercury = require('mercury');
var AttributeHook = require('../../../lib/mercury/attribute-hook');
var insertCss = require('insert-css');
var displayItemDetails = require('./display-item-details');
var browseService = require('../../../services/browse-service');
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

    selectedTabIndex: mercury.value(0),

  });

  var events = mercury.input([
    'displayItemDetails',
    'tabSelected'
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
      }, 'Signature'),
    ]),
    h('core-selector', {
      'selected': new AttributeHook(state.selectedTabIndex)
    }, [
      h('div.tab-content', renderDetailsTab()),
      h('div.tab-content', rendersignatureTab())
    ])
  ];

  function renderDetailsTab() {
    var typeInfo = browseService.getTypeInfo(state.signature);
    return [
      h('div', [
        renderFieldItem('Name', (state.itemName || '<root>')),
        renderFieldItem('Type', typeInfo.name, typeInfo.description)
      ]),
    ];
  }

  function rendersignatureTab() {
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
      return h('div.empty', 'No signature');
    }

    function renderMethod(name, param) {
      var text = name + '('
      for (var i = 0; i < param.inArgs.length; i++) {
        var arg = param.inArgs[i];
        if (i > 0) {
          text += ',';
        }
        text += arg;
      }
      text += ')';
      if (param.isStreaming) {
        text += ' - streaming'
      }
      return h('pre', text);
    }
  }
}

/*TODO(aghassemi) make a web component for this*/
function renderFieldItem(label, content, tooltip) {

  var label = h('h4', label);
  if (tooltip) {
    // If there is a tooltip, wrap the content in it
    content = h('core-tooltip.tooltip', {
      'label': new AttributeHook(tooltip),
      'position': 'right',
    }, content);
  }

  return h('div.field', [
    h('h4', label),
    h('div.content', content)
  ]);
}

// Wire up events that we know how to handle
function wireUpEvents(state, events) {
  events.displayItemDetails(displayItemDetails.bind(null, state));
  events.tabSelected(function(data) {
    state.selectedTabIndex.set(data.index);
  });
}