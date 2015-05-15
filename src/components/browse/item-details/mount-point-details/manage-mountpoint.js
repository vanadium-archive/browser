// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var namespaceService = require('../../../../services/namespace/service');

var log = require('../../../../lib/log')(
  'components:browse:item-details:mount-point:manage-mountpoint'
);

module.exports = {
  deleteMountPoint: deleteMountPoint
};

/*
 * Delete a given mountpoint
 */
 //TODO(aghassemi) Prompt for confirmation
function deleteMountPoint(state, events) {
  var name = state.itemName;
  return namespaceService.deleteMountPoint(name).then(function() {
    events.toast({
      text: name + ' deleted successfully'
    });
  }).catch(function(err) {
    var errText = 'Could not delete ' + name;
    if (err && err.id === 'v.io/v23/verror.NoAccess') {
      errText = 'Not authorized to delete ' + name;
    }

    log.error(errText, name, err);
    events.toast({
      text: errText,
      type: 'error'
    });

    return Promise.reject(err);
  });
}
