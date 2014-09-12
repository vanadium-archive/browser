module.exports = installMockVeyronExtension;
/*
 * Add a mock of the veyron Chrome extension.
 * It responds to auth requests with a fake identity name.
 */
function installMockVeyronExtension() {
  var isBrowser = (typeof window === 'object');
  if (!isBrowser) {
    return;
  }

  var Postie = require('postie');
  var webApp = new Postie(window);

  function handleAuthRequest() {
    process.nextTick(function() {
      webApp.post('auth:success', {
        name: '/veyron/mock/identity'
      });
    });
  }

  webApp.on('auth', handleAuthRequest);
}