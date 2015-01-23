var mercury = require('mercury');
var insertCss = require('insert-css');
var vis = require('vis');

var namespaceService = require('../../../../services/namespace/service');

var log = require('../../../../lib/log')('components:browse:items:tree-view');

var css = require('./index.css');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

function create() {}

function render(itemsState, browseState, browseEvents, navEvents) {

  insertCss(css);

  return [
    h('h2', 'Visualize View'),
    new TreeWidget(browseState, browseEvents)
  ];
}

// Maximum number of levels that are automatically shown
// TODO(aghassemi) Switch to globbing <namespace>/... instead
var MAX_AUTO_LOAD_DEPTH = 3;

function TreeWidget(browseState, browseEvents) {
  this.browseState = browseState;
  this.browseEvents = browseEvents;
  this.nodes = new vis.DataSet();
  this.edges = new vis.DataSet();
}

TreeWidget.prototype.type = 'Widget';

// Dom element to initialize the network in
var networkElem;

TreeWidget.prototype.init = function() {
  this.initNetworkElem();

  requestAnimationFrame(this.initNetwork.bind(this));

  // wrap in a new element, needed for Mercury vdom to patch properly.
  var wrapper = document.createElement('div');
  wrapper.appendChild(networkElem);
  return wrapper;
};


TreeWidget.prototype.initNetworkElem = function() {
  if (!networkElem) {
    networkElem = document.createElement('div');
    networkElem.className = 'network';
  }
};

// We keep track of previous namespace that was browsed to so we can
// know when navigating to a different namespace happens.
var previousNamespace;
TreeWidget.prototype.initNetwork = function() {
  if (previousNamespace === this.browseState.namespace) {
    return;
  }

  previousNamespace = this.browseState.namespace;

  var self = this;

  // Add the initial node.
  var rootNodeId = this.browseState.namespace;
  this.nodes.add({
    id: rootNodeId,
    label: rootNodeId || '<root>',
    level: 0
  });

  // Load the subnodes.
  this.rootNode = this.nodes.get(rootNodeId);
  this.loadSubNodes(this.rootNode);

  var options = {
    hover: false,
    selectable: true, // Need this or nodes won't be click-able
    smoothCurves: false,
    edges: {
      width: 1
    },
    nodes: {
      radiusMin: 16,
      radiusMax: 32,
      fontColor: '#333333',
      shape: 'dot',
      color: {
        background: '#03a9f4',
        border: '#0288d1'
      }
    }
  };

  // Start drawing the network.
  var network = new vis.Network(networkElem, {
    nodes: this.nodes,
    edges: this.edges
  }, options);

  // Event listeners.
  network.on('click', function onClick(data) {
    // refresh side view
    var nodeId = data.nodes[0];
    var node = network.nodes[nodeId];

    if (node) {
      self.browseEvents.selectItem({
        name: nodeId
      });
    }
  });

  network.on('doubleClick', function onClick(data) {
    // drill
    var nodeId = data.nodes[0];
    var node = network.nodes[nodeId];

    if (node && !node.subNodesLoaded) {
      self.loadSubNodes(node);
    }
  });

  return network;
};

TreeWidget.prototype.loadSubNodes = function(node) {
  var namespace = node.id;
  node.subNodesLoaded = true;
  node.title = undefined;
  var self = this;
  namespaceService.getChildren(namespace).then(function(resultObservable) {
    mercury.watch(resultObservable, function(results) {

      // TODO(aghassemi) support removed and updated nodes when we switch to
      // watchGlob
      var existingIds = self.nodes.getIds();
      var nodesToAdd = results.filter(function(item) {
        var isNew = existingIds.indexOf(item.objectName) === -1;
        return isNew;
      });
      var newNodes = nodesToAdd.map(function(item) {
        var shape = 'dot';
        var color;
        if (item.isServer) {
          shape = 'triangle';
          color = '#ffab40';
        }
        return {
          id: item.objectName,
          label: item.mountedName,
          level: node.level + 1,
          shape: shape,
          color: color,
          isGlobbable: item.isGlobbable
        };
      });
      var newEdges = nodesToAdd.map(function(item) {
        return {
          from: namespace,
          to: item.objectName,
          color: '#cccccc'
        };
      });
      newNodes.forEach(function(item) {
        // recurse if within the MAX_AUTO_LOAD_DEPTH
        if (!item.isGlobbable) {
          return;
        }
        if (item.level - self.rootNode.level < MAX_AUTO_LOAD_DEPTH) {
          self.loadSubNodes(item);
        } else {
          item.title = 'Double-click to expand';
        }
      });
      self.nodes.add(newNodes);
      self.edges.add(newEdges);
    });
  }).catch(function(err) {
    log.error('glob failed', err);
  });
};

TreeWidget.prototype.update = function(prev, networkElem) {};