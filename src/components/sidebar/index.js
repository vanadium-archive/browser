var mercury = require('mercury');
var browseRoute = require('../../routes/browse');
var helpRoute = require('../../routes/help');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Sidebar part of the layout
 */
function create() {}

function render(navigationState) {
  return [
    h('core-toolbar', [
      h('h1', 'Veyron Browser')
    ]),
    h('core-menu', {
        'selected': navigationState.pageKey,
        'valueattr': 'itemKey'
      },
      renderNavigationItems()
    )
  ];
}

var navigationItems = [{
  key: 'browse',
  label: 'Browse',
  icon: 'search',
  href: browseRoute.createUrl()
}, {
  key: 'help',
  label: 'Help',
  icon: 'help',
  href: helpRoute.createUrl()
}];

function renderNavigationItems() {
  return navigationItems.map(function createMenuItem(navItem) {
    return h('core-item', {
      'itemKey': navItem.key,
      'icon': navItem.icon,
      'label': navItem.label
    }, [
      h('a', {
        'href': navItem.href
      })
    ]);
  });
}