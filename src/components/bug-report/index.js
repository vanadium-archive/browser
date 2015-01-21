var mercury = require('mercury');
var insertCss = require('insert-css');

var h = mercury.h;

var css = require('./index.css');

module.exports = create;
module.exports.render = render;

function create() {}

// TODO(aghassemi) we need a separate repo for Viz. Update Url when we do.
var DEFAULT_TITLE = 'Viz Vanadium Viewer: ';
var BUG_URL = 'https://github.com/veyron/release-issues/issues/new?title=' +
  DEFAULT_TITLE;

function render() {
  insertCss(css);

  var reportBugAction = h('core-tooltip', {
      'label': 'Report a bug or suggest features',
      'position': 'right'
    },
    h('a', {
      'href': BUG_URL,
      'target': '_blank'
    }, h('paper-icon-button.icon', {
      attributes: {
        'icon': 'bug-report'
      }
    }))
  );
  return h('div.bug-reporter', reportBugAction);
}
