var mercury = require('mercury');

module.exports = addDelegatedEvents;

/*
 * Given a list of event names, have mercury's Delegator listenTo them.
 */
function addDelegatedEvents(eventNames) {
  var delegator = mercury.Delegator({
    defaultEvents: false
  });
  eventNames.forEach(function(eventName) {
    delegator.listenTo(eventName);
  });
}