var insertCss = require('insert-css');
var vis = require('vis');
var css = require('./index.css');
var browseService = require('../../services/browse-service');
var log = require('../../lib/log')('components:visualize');

module.exports = create;
module.exports.render = render;

/*
 * Visualize view
 */
function create() {}

function render(browseState) {
  insertCss(css);
  return [
    new TreeWidget(browseState)
  ];
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

  requestAnimationFrame(this.initNetwork.bind(this, elem));

  return elem;
};

TreeWidget.prototype.initNetwork = function(elem) {
  // Add the initial node.
  var rootNodeId = this.browseState.namespace;
  this.nodes.add({
    id: rootNodeId,
    label: rootNodeId || '<root>',
    level: 0
  });

  // Load the first level of subnodes.
  var rootNode = this.nodes.get(rootNodeId);
  this.loadSubNodes(rootNode);

  var options = {
    dragNetwork: false,
    dragNodes: false,
    hover: true,
    selectable: false, // Setting this to false doesn't seem to do anything.
    smoothCurves: false,
    stabilize: false,
    hierarchicalLayout: {
        direction: 'UD' // Up to down
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
    }
  };

  // Start drawing the network.
  var network = new vis.Network(elem, {
    nodes: this.nodes,
    edges: this.edges
  }, options);

  // Event listeners.
  var self = this;
  network.on('click', function onClick(data) {
    var nodeId = data.nodes[0];
    log.debug('click', nodeId);

    var node = self.nodes.get(nodeId);
    self.loadSubNodes(node);
  });

  network.on('doubleClick', function onClick(data) {
    var nodeId = data.nodes[0];
    log.debug('doubleClick', nodeId);
    log.debug(self.browseState);
  });

  return network;
};

TreeWidget.prototype.loadSubNodes = function(node) {
  var namespace = node.id;
  // The new nodes should be at a deeper level that the parent.
  var level = node.level + 1;

  var self = this;
  browseService.glob(namespace, '*').then(function(results) {
    var newNodes = results.map(function(item) {
      return {
        id: item.name,
        label: item.mountedName,
        level: level
      };
    });
    var newEdges = results.map(function(item) {
      return {
        from: namespace,
        to: item.name
      };
    });
    self.nodes.add(newNodes);
    self.edges.add(newEdges);
  });
};

TreeWidget.prototype.update = function(prev, elem) {};
