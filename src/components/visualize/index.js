var mercury = require('mercury');
var insertCss = require('insert-css');
var vis = require('vis');
var h = mercury.h;
var css = require('./index.css');
var browseService = require('../../services/browse-service');

module.exports = create;
module.exports.render = render;

/*
 * Visualize view
 */
function create() {

}

function render(browseState) {
  insertCss(css);
  return [
    new TreeWidget(browseState)
  ]
}

function TreeWidget(browseState) {
  if (!(this instanceof TreeWidget)) {
    return new TreeWidget(browseState);
  }

  this.browseState = browseState;
  this.nodes = new vis.DataSet();
  this.edges = new vis.DataSet();
}

TreeWidget.prototype.type = 'Widget';

TreeWidget.prototype.init = function() {
  var elem = document.createElement('div');
  elem.className = 'tree';
  var network;
  requestAnimationFrame(function() {
    initNetwork();
  });
  var self = this;

  var label = this.browseState.namespace || '<root>';
  this.nodes.add({
    id: this.browseState.namespace,
    label: label
  });
  this.loadData(this.browseState.namespace);

  function initNetwork() {
    network = new vis.Network(elem, {
      nodes: self.nodes,
      edges: self.edges
    }, {
      clustering: {
        enabled: false,
        clusterEdgeThreshold: 0
      },
      nodes: {
        radiusMin: 16,
        radiusMax: 32,
        fontColor: '#FAFAFA',
        color: {
          background: '#4285f4',
          highlight: '#FF4081',
          border: '#4d73ff'
        }
      },
      stabilize: false
    });
  }

  return elem;
}

TreeWidget.prototype.loadData = function(namespace) {
  var self = this;
  browseService.glob(namespace, '*').then(function(results) {
    var newNodes = results.map(function(item) {
      return {
        id: item.name,
        label: item.mountedName
      }
    });
    var newEdges = results.map(function(item) {
      return {
        from: namespace,
        to: item.name
      }
    });
    self.nodes.add(newNodes);
    self.edges.add(newEdges);
    results.forEach(function(item) {
      self.loadData(item.name);
    });
  });
};

TreeWidget.prototype.update = function(prev, elem) {
}