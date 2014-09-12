// Mocking the LRU cache used by namespace browser so we can test caching logic
module.exports = {
  cache: {},
  lastCallWasCacheHit: false,
  get: function(key) {
    this.lastCallWasCacheHit = (this.cache[key] !== undefined);
    return this.cache[key];
  },
  set: function(key, val) {
    this.cache[key] = val;
  },
  reset: function() {
    this.lastCallWasCacheHit = false;
    this.cache = {};
  }
};