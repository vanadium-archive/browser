module.exports = registerRoutes;

/*
 * Registers all route handlers.
 */
function registerRoutes(routes) {
  require('./index')(routes);
  require('./help')(routes);
  require('./browse')(routes);
}