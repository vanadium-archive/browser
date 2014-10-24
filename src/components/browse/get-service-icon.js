module.exports = getServiceIcon;

var serviceIconMap = Object.freeze({
  'veyron-mounttable': ['social:circles-extended', 'social:circles-extended'],
  'veyron-unknown': ['cloud-queue', 'cloud'],
  '': ['folder-open', 'folder']
});

/*
 * Given the type of a service and whether the element should be filled or not,
 * return the name of the corresponding core-icon to use for rendering.
 */
function getServiceIcon(type, fill) {
  return serviceIconMap[type][fill ? 1 : 0];
}