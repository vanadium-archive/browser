// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var log = require('../../../src/lib/log');

test('logger.error - All levels enabled', function(t) {
  var mc = new MockConsole();

  log.enable('foo*');

  var logger = log('foo', {console: mc});
  logger.error('so bad');

  t.equal(mc.getLastWrite('error'), 'foo:error so bad',
    'should write errors if all levels are enabled');

  reset();
  t.end();
});

test('logger.error - Error enabled', function(t) {
  var mc = new MockConsole();

  log.enableError('foo*');

  var logger = log('foo', {console: mc});
  logger.error('so bad');

  t.equal(mc.getLastWrite('error'), 'foo:error so bad');

  reset();
  t.end();
});

test('logger.error - Warn enabled', function(t) {
  var mc = new MockConsole();

  log.enableWarn('*');

  var logger = log('foo', {console: mc});
  logger.error('so bad');

  t.equal(mc.getLastWrite('error'), 'foo:error so bad',
    'should write errors if warn level is enabled');

  reset();
  t.end();
});

test('logger.error - Nothing enabled', function(t) {
  var mc = new MockConsole();

  var logger = log('foo', {console: mc});
  logger.error('so bad');

  t.notOk(mc.getLastWrite('error'));

  reset();
  t.end();
});

test('logger.error - Error enabled but different module', function(t) {
  var mc = new MockConsole();

  log.enableError('bar*');

  var logger = log('foo', {console: mc});
  logger.error('so bad');

  t.notOk(mc.getLastWrite('error'));

  reset();
  t.end();
});

test('logger.error - Multiple modules enabled', function(t) {
  var mc = new MockConsole();

  log.enableError('bar*, foo*');

  var logger = log('foo', {console: mc});
  logger.error('so bad');

  t.equal(mc.getLastWrite('error'), 'foo:error so bad');

  reset();
  t.end();
});

test('logger.warn - Warn enabled', function(t) {
  var mc = new MockConsole();

  log.enableWarn('foo*');

  var logger = log('foo', {console: mc});
  logger.warn('kinda bad');

  t.equal(mc.getLastWrite('warn'), 'foo:warn kinda bad');

  reset();
  t.end();
});

test('logger.warn - Error enabled', function(t) {
  var mc = new MockConsole();

  log.enableError('foo*');

  var logger = log('foo', {console: mc});
  logger.error('so bad');

  t.notOk(mc.getLastWrite('warn'),
    'should not write warn if error level is enabled');

  reset();
  t.end();
});

test('logger.debug - All enabled', function(t) {
  var mc = new MockConsole();

  log.enable('foo*');

  var logger = log('foo', {console: mc});
  logger.debug('not too bad');

  t.equal(mc.getLastWrite('log'), 'foo not too bad');

  reset();
  t.end();
});

// We need to reset on every test since enable, disable are singletons in debug
function reset() {
  log.disable();
}

function MockConsole() {
  this._lastWrites = {
    log : '',
    warn : '',
    error : ''
  };
}

MockConsole.prototype.getLastWrite = function(method) {
  return this._lastWrites[method];
};

// Stub out console methods
[
  'log',
  'warn',
  'error'
].forEach(function(m) {
  MockConsole.prototype[m] = function(val) {
    // ignore colors ( %c ) and the +<n>ms at the end of console logs from debug
    val = val.replace(/%c|\s\+.*ms$/g, '');
    this._lastWrites[m] = val;
  };
});
