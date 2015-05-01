// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var insertCss = require('insert-css');
var browseRoute = require('../../routes/browse');
var helpRoute = require('../../routes/help');
var demoRoute = require('../../routes/demo');

var BugReport = require('../bug-report/index');

var css = require('./index.css');

var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Sidebar part of the layout
 */
function create() {}

function render(state, events) {
  return [
    h('core-menu', {
        'selected': state.navigation.pageKey,
        'valueattr': 'itemKey'
      },
      renderNavigationItems(events)
    )
  ];

  function renderNavigationItems() {
    var navigationItems = [{
      key: 'browse',
      label: 'Browse',
      icon: 'explore',
      href: browseRoute.createUrl(state.browse)
    }, {
      key: 'demo',
      label: 'Sample World Demo',
      icon: 'av:play-circle-fill',
      href: demoRoute.createUrl()
    }, {
      key: 'help',
      label: 'Help',
      icon: 'help',
      href: helpRoute.createUrl()
    }, {
      key: 'bug',
      label: 'Report a bug',
      icon: BugReport.BUG_REPORT_ICON,
      href: BugReport.BUG_REPORT_URL,
      newWindow: true
    }];

    insertCss(css);
    return navigationItems.map(function createMenuItem(navItem) {
      return h('core-item.nav-item', {
        'itemKey': navItem.key,
        'icon': navItem.icon,
        'label': navItem.label
      }, [
        h('a', {
          'target': (navItem.newWindow ? '_blank' : undefined),
          'href': navItem.href,
          'ev-click': [
            mercury.event(events.navigation.navigate, {
              path: navItem.href
            }),
            mercury.event(events.viewport.closeSidebar)
          ]
        })
      ]);
    });
  }
}