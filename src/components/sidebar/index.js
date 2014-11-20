var mercury = require('mercury');
var insertCss = require('insert-css');
var browseRoute = require('../../routes/browse');
var helpRoute = require('../../routes/help');
var visualizeRoute = require('../../routes/visualize');
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
      label: 'Iconview',
      icon: 'apps',
      href: browseRoute.createUrl(
        state.browse.namespace,
        state.browse.globQuery
      )
    }, {
      key: 'tree',
      label: 'Treeview',
      icon: 'chevron-left',
      href: browseRoute.createUrl(
        state.browse.namespace,
        state.browse.globQuery
      )
    }, {
      key: 'visualize',
      label: 'Visualize',
      icon: 'social:circles-extended',
      href: visualizeRoute.createUrl()
    }, {
      key: 'help',
      label: 'Help',
      icon: 'help',
      href: helpRoute.createUrl()
    }];

    insertCss(css);
    return navigationItems.map(function createMenuItem(navItem) {
      return h('core-item.nav-item', {
        'itemKey': navItem.key,
        'icon': navItem.icon,
        'label': navItem.label
      }, [
        h('a', {
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
