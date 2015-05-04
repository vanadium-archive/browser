// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var insertCss = require('insert-css');

var displayMountPointDetails = require('./display-mountpoint-details');

var FieldItem = require('../field-item');
var ErrorBox = require('../../../error/error-box');

var css = require('./index.css');
var h = mercury.h;

module.exports = create;
module.exports.render = render;
module.exports.displayMountPointDetails = displayMountPointDetails;

/*
 * MountPointDetails component provides user interfaces for displaying
 * details about a mount point such the permissions, its parent mounttable
 * and the full name of the mount point.
 * TODO(aghassemi) Add UI for manipulating the mountpoint such as mount,
 * unmount, setPermissions, etc..
 */
function create() {
  var state = mercury.varhash({

    /*
     * namespace item to display mount point details for.
     * @see services/namespace/item
     * @type {namespaceitem}
     */
    item: mercury.value(null),

    /*
     * Name of the item.
     * @type {string}
     */
    itemName: mercury.value(''),

    /*
     * Any fatal error while getting the mount point details.
     * Note: will be displayed to user.
     * @type Error
     */
    error: mercury.value(null),

    /*
     * Whether a loading indicator should be displayed instead of content
     * @type {mercury.value<boolean>}
     */
    showLoadingIndicator: mercury.value(false),

    /*
     * Map of permissions for the mount point.
     * @type {map<string,vanadium.security.Permissions>}
     */
    permissions: mercury.value(null),

    /*
     * whether user is even authorized to see the permission for the mount point
     * @type {boolean}
     */
    notAuthorizedToSeePermissions: mercury.value(false),

    /*
     * The objectAddresses as resolveToMounttable
     * @type {mercury.array<string>}
     */
    objectAddresses: mercury.array([])

  });

  var events = mercury.input([
    'toast'
  ]);

  return {
    state: state,
    events: events
  };
}

/*
 * Render the mount point details page.
 */
function render(state, events, browseState, navEvents) {
  insertCss(css);

  var content = [];

  // Details can only be shown if there is an item.
  if (state.item) {
    var displayItems = [];
    displayItems.push(renderNameField(state));
    displayItems.push(renderObjectAddressesField(state));
    displayItems.push(renderPermissionsField(state));

    content.push(h('div', displayItems));
  }

  // Show any errors from getting the details
  if (state.error) {
    var errorTitle = 'Unable to connect to ' + state.itemName;
    content.push(ErrorBox.render(errorTitle, state.error.toString()));
  }

  // Show the loading indicator if it's available.
  if (state.showLoadingIndicator) {
    content.push(h('paper-spinner', {
      attributes: {
        'active': true,
        'aria-label': 'Loading'
      }
    }));
  }

  return content;
}

/*
 * Renders the Full Name field
 */
function renderNameField(state) {
  return FieldItem.render('Full Name', (state.itemName || '<Home>'));
}

/*
 * Renders the ObjectAddresses field which should be the objectAddresses at the
 * parent mount table (i.e. result of call to resolveToMounttable())
 */
function renderObjectAddressesField(state) {
  return FieldItem.render(
    'Mount Point Object Addresses', (state.objectAddresses), {
      contentTooltip: 'Object addresses at the parent mount table'
    });
}

/*
 * Renders the permissions field
 */
function renderPermissionsField(state) {
  var content;

  if (state.notAuthorizedToSeePermissions) {
    content = h('span', 'Not authorized to see the permissions');
  } else if (state.permissions && state.permissions.size > 0) {
    content = formatPermissions(state.permissions);
  } else if (state.permissions) {
    content = h('span', 'No specific permissions set');
  }

  return FieldItem.render('Permissions', content);
}

/*
 * Formats a permissions object to string
 * TODO(aghassemi): we need a nicer permission formatter
 * @param {vanadium.security.Permissions} perms
 */
function formatPermissions(perms) {
  //
  var results = [];
  perms.forEach(function(p, key) {
    results.push(
      h('div.permission-item', [
        h('div.permission-name', key),
        h('div', formatPermission(p))
      ])
    );
  });

  return h('div', results);
}

/*
 * Formats a single permission object to string
 * @param {vanadium.security.AccessList} perm
 */
function formatPermission(perm) {
  var results = [];
  if (perm.in && perm.in.length > 0) {
    results.push(
      h('div.permissions-wrapper', [
        h('span.permission-in', 'In: '),
        renderBlessingsList(perm.in)
      ])
    );
  }

  if (perm.notIn && perm.notIn.length > 0) {
    results.push(
      h('div', [
        h('span.permission-out', 'Not In: '),
        renderBlessingsList(perm.notIn)
      ])
    );
  }

  function renderBlessingsList(list) {
    var items = list.map(function(item) {
      return h('li', item);
    });
    return h('ul', items);
  }

  return h('div', results);
}