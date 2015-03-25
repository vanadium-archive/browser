// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var uuid = require('uuid');

module.exports = {
  register: register,
  matches: matches
};

var plugins = [];

/*
 * Register a plugin
 * @param {plugin} Plugin Plugin to register
 * 	@see {plugin.js.doc}
 */
function register(plugin) {

  // generate a unique id for the plugin.
  // TODO(aghassemi) we may want these ids to be static, but that makes it
  // harder to coordinate uniques across system and remote plugins. For now
  // id is only used in a single UI context so it can stay dynamic.
  plugin.id = uuid.v4();

  plugins.push(plugin);
}

/*
 * For a given pair of Vanadium object name and its signature, returns all
 * plugins that support it.
 * @param {string} name Vanadium object name for the item.
 * @param {signature} signature Signature of the item.
 * @return {Array<plugin>} Array of supported plugins.
 */
function matches(name, signature) {
  return plugins.filter(function(p) {
    return (p.canSupport && p.canSupport(name, signature));
  });
}