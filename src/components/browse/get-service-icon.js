module.exports = getServiceIcon;

var ItemTypes = require('../../services/namespace/item-types');

var serviceIconMap = Object.freeze({
  'vanadium-mounttable': 'dns',
  'vanadium-unknown': 'cloud-queue'
});

/*
 * Given an item returns an structure with the name of the corresponding
 * core-icon and a title for the icon to use for rendering.
 */
function getServiceIcon(item) {
  var icon = '';
  var title = '';
  switch (item.itemType) {
    case ItemTypes.server:
      icon = serviceIconMap[item.serverInfo.typeInfo.key];
      title = item.serverInfo.typeInfo.typeName;
      break;
    case ItemTypes.subtable:
      icon = 'folder-open';
      title = 'Subtable';
      break;
    case ItemTypes.inaccessible:
      icon = 'error';
      title = item.itemError ? item.itemError : 'Inaccessible';
      break;
    case ItemTypes.loading:
      icon = 'help';
      title = 'Loading';
      break;
  }
  return {
    icon: icon,
    title: title
  };
}
