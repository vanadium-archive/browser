var mercury = require('mercury');
var insertCss = require('insert-css');
var getServiceIcon = require('./get-service-icon');

var AttributeHook = require('../../../../lib/mercury/attribute-hook');

var browseRoute = require('../../../../routes/browse');

var css = require('./index.css');
var h = mercury.h;

module.exports.render = render;

/*
 * Renders a namespace item in a card view.
 * @param item {namespaceitem} @see services/namespace/item
 */
function render(item, browseState, browseEvents, navEvents) {
  insertCss(css);

  var selected = (browseState.selectedItemName === item.objectName);

  var url = browseRoute.createUrl(browseState, {
    namespace: item.objectName,
    viewType: 'grid'
  });

  // Prepare the drill if this item happens to be globbable.
  var expandAction = null;
  if (item.isGlobbable) {
    expandAction = h('a.drill', {
      'href': url,
      'ev-click': mercury.event(navEvents.navigate, {
        path: url
      })
    }, h('core-icon.icon', {
      'icon': new AttributeHook('chevron-right')
    }));
  }

  // Prepare tooltip and service icon information for the item.
  var isAccessible = true;
  var itemTooltip = item.objectName;
  var iconCssClass = '.service-type-icon';
  var iconAttributes = {};

  if (item.isServer) {
    isAccessible = item.serverInfo.isAccessible;
    if (!isAccessible) {
      itemTooltip += ' - Service seems to be offline or inaccessible';
    }
    iconAttributes.title = new AttributeHook(item.serverInfo.typeInfo.typeName);
    iconAttributes.icon = new AttributeHook(
      getServiceIcon(item.serverInfo.typeInfo.key)
    );
  } else {
    iconAttributes.title = new AttributeHook('Intermediary Name');
    iconAttributes.icon = new AttributeHook(getServiceIcon(''));
  }

  // Construct the service icon.
  var iconNode = h('core-icon' + iconCssClass, iconAttributes);

  // Put the item card's pieces together.
  var itemClassNames = 'item.card' +
    (selected ? '.selected' : '') +
    (!isAccessible ? '.inaccessible' : '');

  return h('div.' + itemClassNames, {
    'title': itemTooltip
  }, [
    h('a.label', {
      'href': 'javascript:;',
      'ev-click': mercury.event(
        browseEvents.selectItem, {
          name: item.objectName
        })
    }, [
      iconNode,
      h('span', item.mountedName || '<root>')
    ]),
    expandAction
  ]);
}