// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = getServiceIcon;

/*
 * Given an item returns an structure with the name of the corresponding
 * core-icon and a title for the icon to use for rendering.
 */
function getServiceIcon(item) {
  var icon;
  var title;
  if (item.hasMountPoint && item.hasServer) {
    icon = 'cloud-queue';
    title = 'MountPoint & Service';
  } else if (item.hasServer) {
    icon = 'social:circles';
    title = 'Service';
  } else {
    icon = 'check-box-outline-blank';
    title = 'MountPoint';
  }

  return {
    icon: icon,
    title: title
  };
}
