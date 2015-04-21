// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var helpRoute = require('../../routes/help');

var tabKeys = Object.freeze({
  MAIN: 'main',       // Describes the Vanadium Browser to new users.
  VIEWS: 'views', // Defines service information and icons.
  BROWSE: 'browse',   // Introduces how to browse the namespace.
  METHODS: 'methods', // Explains how to make RPCs.
  SAMPLE: 'sample', // Sample world (house and cottage)
  FAQ: 'faq'          // Frequently asked questions and contact information.
});

var sections = Object.freeze(new Map([
  [tabKeys.MAIN, {
    index: 0,
    header: 'Overview and Concepts',
    markdownContent: require('./content/main.md'),
    path: helpRoute.createUrl(tabKeys.MAIN)
  }],
  [tabKeys.VIEWS, {
    index: 1,
    header: 'What You See',
    markdownContent: require('./content/views.md'),
    path: helpRoute.createUrl(tabKeys.VIEWS)
  }],
  [tabKeys.BROWSE, {
    index: 2,
    header: 'Browse',
    markdownContent: require('./content/browse.md'),
    path: helpRoute.createUrl(tabKeys.BROWSE)
  }],
  [tabKeys.METHODS, {
    index: 3,
    header: 'Details and Methods',
    markdownContent: require('./content/methods.md'),
    path: helpRoute.createUrl(tabKeys.METHODS)
  }],
  [tabKeys.SAMPLE, {
    index: 4,
    header: 'Sample World',
    markdownContent: require('./content/sample.md'),
    path: helpRoute.createUrl(tabKeys.SAMPLE)
  }],
  [tabKeys.FAQ, {
    index: 5,
    header: 'FAQ',
    markdownContent: require('./content/faq.md'),
    path: helpRoute.createUrl(tabKeys.FAQ)
  }]
]));

module.exports = {
  tabKeys: tabKeys,
  sections: sections
};
