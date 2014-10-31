var helpRoute = require('../../routes/help');

var tabKeys = Object.freeze({
  MAIN: 'main',       // Describes the Veyron Browser to new users.
  BROWSE: 'browse',   // Introduces how to browse the namespace.
  DETAILS: 'details', // Defines service information and icons.
  METHODS: 'methods', // Explains how to make RPCs.
  FAQ: 'faq'          // Frequently asked questions and contact information.
});

var sections = Object.freeze(new Map([
  [tabKeys.MAIN, {
    index: 0,
    header: 'Main Help',
    markdownContent: require('./content/main.md'),
    path: helpRoute.createUrl(tabKeys.MAIN)
  }],
  [tabKeys.BROWSE, {
    index: 1,
    header: 'How to Browse',
    markdownContent: require('./content/browse.md'),
    path: helpRoute.createUrl(tabKeys.BROWSE)
  }],
  [tabKeys.DETAILS, {
    index: 2,
    header: 'What You See',
    markdownContent: require('./content/details.md'),
    path: helpRoute.createUrl(tabKeys.DETAILS)
  }],
  [tabKeys.METHODS, {
    index: 3,
    header: 'Talk to Services',
    markdownContent: require('./content/methods.md'),
    path: helpRoute.createUrl(tabKeys.METHODS)
  }],
  [tabKeys.FAQ, {
    index: 4,
    header: 'FAQ',
    markdownContent: require('./content/faq.md'),
    path: helpRoute.createUrl(tabKeys.FAQ)
  }]
]));

module.exports = {
  tabKeys: tabKeys,
  sections: sections
};