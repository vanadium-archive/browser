var mercury = require('mercury');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

/*
 * Sidebar part of the layout
 */
function create() {}

function render(navigationState, navigationEvents) {
  return [
    h('core-toolbar', [
      h('h1', 'Veyron Browser')
    ]),
    h('core-menu', {
        'selected': navigationState.pageKey,
        'valueattr': 'itemKey'
      },
      renderNavigationItems(navigationEvents)
    )
  ];
}

var navigationItems = [{
  key: 'browse',
  label: 'Browse',
  icon: 'search'
}, {
  key: 'help',
  label: 'Help',
  icon: 'help'
}];

function renderNavigationItems(navigationEvents) {
  return navigationItems.map(function createMenuItem(navItem) {
    return h('core-item', {
      'itemKey': navItem.key,
      'icon': navItem.icon,
      'label': navItem.label
    }, [
      h('a', {
        'href': '#/' + navItem.key,
        'ev-click': mercury.event(
          navigationEvents.navigate, {
            path: '/' + navItem.key
          }
        )
      })
    ]);
  });
}