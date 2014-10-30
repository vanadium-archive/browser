var mercury = require('mercury');
var store = require('../../lib/store');
var log = require('../../lib/log')('debug');

module.exports = create;
module.exports.enableContinuousRendering = enableContinuousRendering;

function create() {

  var state = mercury.varhash({
    continuousRendering: mercury.struct({
      /*
       * Enables continuous rendering for debugging purposes.
       */
      enabled: mercury.value(false),
      /*
       * Internal ticker that can be used to force state change.
       */
      ticker: mercury.value(0)
    })
  });

  watchContinuousRendering(state.get('continuousRendering'));

  return {
    state: state
  };
}

/*
 * Watches for changes to continuousRendering enabled state
 */
function watchContinuousRendering(state) {
  var renderer;
  mercury.watch(state.enabled, function(enabled) {
    if (!enabled) {
      clearInterval(renderer);
      renderer = null;
      return;
    }
    if (!renderer) {
      log.warn('Continuous rendering is enabled.' +
        ' Use window.enableContinuousRendering(false) to disable');
      // Add to ticker value every 16ms to cause state change and rerender
      renderer = setInterval(function() {
        state.ticker.set(state.ticker + 1);
      }, 16);
    }
  });

  // Load previous preference from store
  store.getValue('continuousRendering').then(function(enabled) {
    enabled = !!enabled; // Cast to bool
    state.enabled.set(enabled);
  }).catch(function() {
    log.error('Could not get value of continuousRendering from store');
  });
}

/*
 * Enables continuous rendering for debugging purposes.
 */
function enableContinuousRendering(state, enabled) {
  enabled = !!enabled; // Cast to bool
  state.get('continuousRendering').enabled.set(enabled);
  store.setValue('continuousRendering', enabled).catch(function() {
    log.error('Could not save value of continuousRendering to store');
  });
}