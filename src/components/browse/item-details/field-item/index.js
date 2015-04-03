// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var insertCss = require('insert-css');
var css = require('./index.css');

var h = mercury.h;

module.exports = create;
module.exports.render = render;

function create() {}

/*
 * Renders a single field item
 */
function render(label, content, options) {
  insertCss(css);
  options = options || {};

  var hlabel = h('h4', label);
  var hinfo = h('span');
  if (options.labelTooltip) {
    // If there is a tooltip, create an info icon with that tooltip.
    hinfo = h('core-tooltip.tooltip.field-tooltip', {
      attributes: {
        'label': options.labelTooltip
      },
      'position': 'left'
    }, h('core-icon.icon.info', {
      attributes: {
        'icon': 'info'
      }
    }));
  }
  content = h('div', {
    key: label,
  }, content);
  if (options.contentTooltip) {
    // If there is a tooltip, wrap the content in it.
    content = h('core-tooltip.tooltip.field-tooltip', {
      attributes: {
        'label': options.contentTooltip
      },
      'position': 'right'
    }, content);
  }

  var expander = h('span');
  if (options.collapsed !== undefined) {
    expander = h('core-icon.icon', {
      attributes: {
        'icon': options.collapsed ? 'chevron-right' : 'expand-more'
      },
      'ev-click': options.callback
    });
  }

  return h('div.field' + (options.collapsed === true ? '.collapsed' : ''), [
    h('div.header', [
      hlabel,
      hinfo,
      expander
    ]),
    h('div.content', content)
  ]);
}