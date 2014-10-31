var mercury = require('mercury');
var h = mercury.h;
var AttributeHook = require('../../lib/mercury/attribute-hook');
var insertCss = require('insert-css');
var css = require('./index.css');
var constants = require('./constants.js');

var tabKeys = constants.tabKeys;
var sections = constants.sections;

module.exports = create;
module.exports.render = render;

/*
 * Help view
 */
function create() {
  var state = mercury.varhash({
    selectedTab: mercury.value(tabKeys.MAIN)
  });
  var events = mercury.input([
    'error',     // Will be wired up by the application.
    'navigate'   // Will be wired up by the application.
  ]);

  return {
    state: state,
    events: events
  };
}

/*
 * Draws the help page, which consists of a tabbed layout and the selected tab's
 * help content. Content comes from a parsed markdown file.
 */
function render(state, events) {
  insertCss(css);

  // Render each help tab, as defined by the sections.
  var tabs = [];
  sections.forEach(function(section, key) {
    var tab = h('paper-tab.tab', {
      'tabKey': key,
      'ev-click': mercury.event(events.navigate, {
        'path': section.path
      })
    }, section.header);
    tabs.push(tab);
  });

  // Show the tabs followed by the content of the selected help tab.
  return [
    h('paper-tabs.tabs', {
      'selectedProperty': new AttributeHook('tabKey'),
      'selected': new AttributeHook(sections.get(state.selectedTab).index),
      'noink': new AttributeHook(true)
    }, tabs),
    h('.tab-content.core-selected', h('.markdown', {
      'innerHTML': sections.get(state.selectedTab).markdownContent
    }))
  ];
}