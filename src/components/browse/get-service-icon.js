module.exports = getServiceIcon;

var serviceIconMap = Object.freeze({
  'veyron-mounttable': 'dns',
  'veyron-unknown': 'cloud-queue',
  '': 'folder-open'
});

/*
 * Given the type of a service and whether the element should be filled or not,
 * return the name of the corresponding core-icon to use for rendering.
 */
function getServiceIcon(type) {
  return serviceIconMap[type];
}
