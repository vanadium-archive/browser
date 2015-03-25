// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

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