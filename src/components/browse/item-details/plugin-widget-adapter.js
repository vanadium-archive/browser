// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = PluginWidgetAdapter;

// Map of plugin.id to previous names. This map allows up to
// only call render when name changes.
var previousNames = {};
// Map of plugin.id to the rendered node for the latest name.
var renderedNodes = {};

/*
 * Adapts a plugin into a mercury widget
 */
function PluginWidgetAdapter(name, plugin) {
  this.name = name;
  this.plugin = plugin;
}

PluginWidgetAdapter.prototype.type = 'Widget';

PluginWidgetAdapter.prototype.init = function() {
  this.render();

  // wrap in a new element, needed for Mercury vdom to patch properly.
  var wrapper = document.createElement('div');
  wrapper.appendChild(renderedNodes[this.plugin.id]);
  return wrapper;
};

PluginWidgetAdapter.prototype.update = function() {};

PluginWidgetAdapter.prototype.render = function() {
  // do not rerender if name has not changed
  if (previousNames[this.plugin.id] === this.name &&
    renderedNodes[this.plugin.id]) {
    return;
  }

  previousNames[this.plugin.id] = this.name;
  // render and cache the DOM
  renderedNodes[this.plugin.id] = this.plugin.render(this.name);
};