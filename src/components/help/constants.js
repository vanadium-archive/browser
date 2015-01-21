var helpRoute = require('../../routes/help');

var tabKeys = Object.freeze({
  MAIN: 'main',       // Describes the Veyron Browser to new users.
  DETAILS: 'details', // Defines service information and icons.
  BROWSE: 'browse',   // Introduces how to browse the namespace.
  METHODS: 'methods', // Explains how to make RPCs.
  FAQ: 'faq'          // Frequently asked questions and contact information.
});

var sections = Object.freeze(new Map([
  [tabKeys.MAIN, {
    index: 0,
    header: 'Viz Overview',
    markdownContent: require('./content/main.md'),
    path: helpRoute.createUrl(tabKeys.MAIN)
  }],
  [tabKeys.DETAILS, {
    index: 1,
    header: 'What You See',
    markdownContent: require('./content/details.md'),
    path: helpRoute.createUrl(tabKeys.DETAILS)
  }],
  [tabKeys.BROWSE, {
    index: 2,
    header: 'Browse',
    markdownContent: require('./content/browse.md'),
    path: helpRoute.createUrl(tabKeys.BROWSE)
  }],
  [tabKeys.METHODS, {
    index: 3,
    header: 'Invoking Services',
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
