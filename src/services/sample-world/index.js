// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var Alarm = require('./alarm.js');
var LightSwitch = require('./lightswitch.js');
var Sprinkler = require('./sprinkler.js');
var Speaker = require('./speaker.js');
var SmokeDetector = require('./smokedetector.js');
var PoolHeater = require('./poolheater.js');
var PetFeeder = require('./petfeeder.js');
var RoboDog = require('./robodog.js');

var namespaceService = require('../namespace/service.js');
var util = namespaceService.util;

module.exports = {
  create: create,
  getRootedName: getRootedName
};

var feeder = new PetFeeder();
var robodog = new RoboDog(feeder);

var SERVICES = [
  ['house/alarm', new Alarm()],
  ['house/living-room/lights', new LightSwitch()],
  ['house/living-room/smoke-detector', new SmokeDetector()],
  ['house/living-room/blast-speaker', new Speaker()],
  ['house/living-room/soundbar', new Speaker()],
  ['house/master-bedroom/desk-lamp', new LightSwitch()],
  ['house/master-bedroom/lights', new LightSwitch()],
  ['house/master-bedroom/smoke-detector', new SmokeDetector()],
  ['house/master-bedroom/speaker', new Speaker()],
  ['house/kitchen/lights', new LightSwitch()],
  ['house/kitchen/smoke-detector', new SmokeDetector()],
  ['house/pet-feeder', feeder],
  ['house/robo-dog', robodog],
  ['cottage/smoke-detector', new SmokeDetector()],
  ['cottage/alarm', new Alarm()],
  ['cottage/lights', new LightSwitch()],
  ['cottage/pool/heater', new PoolHeater()],
  ['cottage/pool/speaker', new Speaker()],
  ['cottage/pool/pool-lights', new LightSwitch()],
  ['cottage/lawn/front/sprinkler', new Sprinkler()],
  ['cottage/lawn/back/sprinkler', new Sprinkler()],
  ['cottage/lawn/master-sprinkler', new Sprinkler()],
];

// Creates and published a sample world under the given name prefix
// Returns a promise that is resolved when all the names are published.
function create(namePrefix) {
  return namespaceService.initVanadium().then(function(runtime) {
    var allServed = [];

    SERVICES.forEach(function(s) {
      var name = util.join(namePrefix, s[0]);
      var service = s[1];
      var servePromise = runtime.newServer(name, service).then(function() {
        return waitUntilPublished(name, runtime);
      });
      allServed.push(servePromise);
    });

    return Promise.all(allServed);
  });
}

/*
 * Returns the full rooted name where sample-world will be served.
 * This is the user's home directory + '/sample-world'
 * @return {Promise<string>}
 */
function getRootedName() {
  return namespaceService.getAccountName().then(function(name) {
    // The account has a blessing of the form: dev.v.io/u/<email>/chrome
    // The object name to mount should be
    // /ns.dev.v.io:8101/users/<email>/sample-world
    name = name.replace(/^dev.v.io\/u\//, 'users/');
    name = name.replace(/\/chrome$/, '');
    return util.join('/ns.dev.v.io:8101', name, 'sample-world');
  });
}

// Helper function that waits until name is published or unpublished,
// it checks every 1000ms for a total of 30 tries before failing.
function waitUntilPublished(name, runtime) {
  var WAIT_TIME = 1000;
  var MAX_TRIES = 30;
  return new Promise(function(resolve, reject) {
    var ns = runtime.getNamespace();
    var count = 0;
    runResolve();

    function runResolve() {
      ns.resolve(runtime.getContext(), name, function(err, s) {
        if (err) {
          count++;
          if (count === MAX_TRIES) {
            reject(
              new Error('Timed out waiting for ' + name + ' to be published')
            );
            return;
          }
          return setTimeout(runResolve, WAIT_TIME);
        }
        resolve();
      });
    }
  });
}
