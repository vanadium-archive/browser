var polymer = require('../../../lib/polymer');

var publishedProperties = {
  vname: ''
};

polymer('viz-plugins-log-viewer', {
  publish: publishedProperties,
  ready: onReady
});

function onReady() {

}