// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
 * DeLogger wraps the popular debug (github.com/visionmedia/debug) module and
 * adds error and warning levels on top of debug.
 *
 *  var logger = require('DeLogger')('app:foo');
 *  var log.error('bad things happened', 'goes to stderr via console.error');
 *  var log.warn('bad things might happen', 'goes to stderr via console.warn');
 *  var log.debug('it's all good, probably', 'goes to stdout via console.log');
 *
 *  log.enableError('app:*'); // Enables error log levels for pattern
 *  log.enableWarn('app:*'); // Enables error and warning log levels for pattern
 *  log.enable('app:*'); // Enables all log levels for pattern

 *  log.disable(); // Disables all logs
 *
 *  TODO(aghassemi) maybe move to github as a separate module and publish on npm
 *  as DeLogger? DeLog is taken :(
 */
var debug = require('debug');

var extendDefaults = require('./extend-defaults');

module.exports = log;
module.exports.disable = disable;
module.exports.enable = debug.enable;
module.exports.enableError = enableError;
module.exports.enableWarn = enableWarn;

var ERROR_LEVEL_SUFFIX = ':error';
var WARN_LEVEL_SUFFIX = ':warn';

// Allows for different implementation of console to be injected.
var defaults = {
  console: console
};

function log(namespace, options) {
  options = extendDefaults(defaults, options);
  var consoleInstance = options.console;

  var errorLogger = debug(namespace + ERROR_LEVEL_SUFFIX);
  var warnLogger = debug(namespace + WARN_LEVEL_SUFFIX);
  var debugLogger = debug(namespace);

  errorLogger.log = coerce(consoleInstance.error, consoleInstance);
  warnLogger.log = coerce(consoleInstance.warn, consoleInstance);
  debugLogger.log = coerce(consoleInstance.log, consoleInstance);

  return {
    error: errorLogger,
    warn: warnLogger,
    debug: debugLogger
  };
}

function enableError(namespaces) {
  debug.enable(appendLevelPattern(namespaces, '*' + ERROR_LEVEL_SUFFIX));
}

function enableWarn(namespaces) {
  // debug.enable is not cumulative and overrides previous values.
  debug.enable(
    appendLevelPattern(namespaces, '*' + ERROR_LEVEL_SUFFIX) + ',' +
    appendLevelPattern(namespaces, '*' + WARN_LEVEL_SUFFIX)
  );
}

function disable() {
  debug.disable();
  debug.names = [];
  debug.skips = [];
}

function appendLevelPattern(namespaces, pattern) {
  var split = (namespaces || '').split(/[\s,]+/);
  return split.map(function(namespace) {
    return namespace += pattern;
  }).join(',');
}

function coerce(consoleFunc, consoleInstance) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    args = args.map(function(arg) {
      if (arg instanceof Error) {
        return arg.stack || arg.message;
      }
      return arg;
    });

    return consoleFunc.apply(consoleInstance, args);
  };
}