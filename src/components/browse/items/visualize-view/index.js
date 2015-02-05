var mercury = require('mercury');
var insertCss = require('insert-css');
var vis = require('vis');

var namespaceService = require('../../../../services/namespace/service');

// var getServiceIcon = require('../../get-service-icon');

var log = require('../../../../lib/log'
    )('components:browse:items:visualize-view');

var css = require('./index.css');
var h = mercury.h;

module.exports = create;
module.exports.render = render;

// Matches HEX value of --color-text-primary in theme.css
var TEXT_COLOR = '#333333';
// Matches --color-bright in theme.css
var INTER_NODE_COLOR = '#6B0E9C';
// Matches --color-text-link-hover in theme.css
var SERVER_NODE_COLOR = '#03A9F4';
// Matches --color-grey-dark in theme.css
var NODE_BORDER = '#263238';
// Matches --color-dark in theme.css
var ROOT_NODE_COLOR = '#4A068E';

function create() {}

function render(itemsState, browseState, browseEvents, navEvents) {
  insertCss(css);

  return [
    new TreeWidget(browseState, browseEvents),
    h('div.vismenu', {  // visualization menu
    }, [
      // to add hierarchy view, add this button and the vismode handler
      // h('paper-fab.mode', {
      //   attributes: {
      //     mini: true,
      //     icon: 'image:grain',
      //     title: 'change mode',
      //     'aria-label': 'change mode'
      //   },
      //   'ev-tap': vismode
      // }),
      h('paper-fab.zoom', {
        attributes: {
          mini: true,
          icon: 'add',
          title: 'zoom in',
          'aria-label': 'zoom in'
        },
        'ev-down': zoom.bind(undefined, true),
        'ev-up': stopzoom
      }),
      h('paper-fab.zoom', {
        attributes: {
          mini: true,
          icon: 'remove',
          title: 'zoom out',
          'aria-label': 'zoom out'
        },
        'ev-down': zoom.bind(undefined, false),
        'ev-up': stopzoom
      }),
    ])
  ];
}

// The visjs visualization
var network, rootNodeId;

// change visualization between hierarchical and network modes
// function vismode() {
//   network._restoreNodes();
//   var el = document.querySelector('paper-fab.mode');
//   if (network.constants.hierarchicalLayout.enabled) {
//     el.className = 'mode';
//     network.constants.hierarchicalLayout.enabled = false;
//     network.constants.physics.hierarchicalRepulsion.enabled = false;
//     network.constants.physics.barnesHut.enabled = true;
//     network.focusOnNode(rootNodeId, { animation: true });
//     network.zoomExtent(true);
//   } else {
//     el.className = 'mode selected';
//     network.constants.physics.barnesHut.enabled = false;
//     network.constants.physics.hierarchicalRepulsion = {
//       enabled: true,
//       nodeDistance: 70
//     };
//     network.constants.hierarchicalLayout.enabled = true;
//     network.constants.physics.hierarchicalRepulsion.enabled = true;
//     network.constants.physics.hierarchicalRepulsion.nodeDistance = 70;
//     network._setupHierarchicalLayout();
//     network.zoomExtent(true);
//   }
//   network._loadSelectedForceSolver();
//   network.moving = true;
//   network.start();
// }

var ZOOM_FACTOR = 0.01; // same as network.constants.keyboard.speed.zoom

// start zooming on button press
function zoom(zin, event) {
  var zi = zin ? ZOOM_FACTOR : -ZOOM_FACTOR;
  var selnodes; // selected nodes
  if (event.shiftKey) {
    selnodes = network.getSelection();
    if (selnodes.nodes.length > 0) {
      network.focusOnNode(selnodes.nodes[0], { animation: true });
    } else {
      network.zoomExtent(true);
    }
  }
  network.zoomIncrement = zi;
  network.start();
}

// stop zooming on button release
function stopzoom() {
  network.zoomIncrement = 0;
}

// repaint visualization canvas when window resizes
window.addEventListener('resize', function redraw(e) {
  if (network) {
    network.redraw();
  }
});

// Maximum number of levels that are automatically loaded below the root
var MAX_AUTO_LOAD_DEPTH = 4;

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

  requestAnimationFrame(this.updateNetwork.bind(this));

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

// Keep track of previous namespace that was browsed to so we can
// know when navigating to a different namespace happens.
var previousNamespace;

TreeWidget.prototype.updateNetwork = function() {
  if (network && network.constants.hierarchicalLayout.enabled) {
    document.querySelector('paper-fab.mode').className = 'mode selected';
  }

  if (previousNamespace === this.browseState.namespace) {
    return;
  }

  previousNamespace = this.browseState.namespace;

  var self = this;

  // Add the initial node.
  rootNodeId = this.browseState.namespace;
  this.nodes.add({
    id: rootNodeId,
    label: rootNodeId || '<root>',
    level: 0,
    shape: 'star',
    color: {
      background: ROOT_NODE_COLOR,
      border: NODE_BORDER
    }
  });

  // Load the subnodes.
  this.rootNode = this.nodes.get(rootNodeId);
  this.loadSubNodes(this.rootNode);

  var options = {
    hover: false,
    selectable: true, // Need this or nodes won't be click-able
    smoothCurves: false,
    physics: {
      barnesHut: {
        enabled: true,
        gravitationalConstant: -2200,
        centralGravity: 0.2,
        springLength: 64,
        springConstant: 0.075,
        damping: 0.12
      }
    },
    hierarchicalLayout: {
      enabled: false,
      direction: 'LR',
      nodeSpacing: 70,
      levelSeparation: 180
    },
    keyboard: { speed: { x: -2, y: -2, zoom: 0.01 }},
    edges: {
      width: 1
    },
    nodes: {
      radiusMin: 16,
      radiusMax: 32,
      fontColor: TEXT_COLOR
    }
  };

  // Start drawing the network.
  network = new vis.Network(networkElem, {
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
        var shape = (item.isServer ? 'triangle' : 'dot');
        var color = {
          background: (item.isServer ? SERVER_NODE_COLOR : INTER_NODE_COLOR),
          border: NODE_BORDER
        };
        return {
          id: item.objectName,
          label: item.mountedName,
          level: node.level + 1,
          shape: shape,
          color: color
        };
      });
      var newEdges = nodesToAdd.map(function(item) {
        return {
          from: namespace,
          to: item.objectName,
          color: TEXT_COLOR
        };
      });
      newNodes.forEach(function(item) {
        // recurse if within the MAX_AUTO_LOAD_DEPTH
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

TreeWidget.prototype.update = function(prev, networkElem) {
  requestAnimationFrame(this.updateNetwork.bind(this));
};
