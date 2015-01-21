// Mocking the LRU cache used by Viz so we can test caching logic
module.exports = {
  cache: {},
  getCallHits: {},
  get: function(key) {
    this.getCallHits[key] = (this.cache[key] !== undefined);
    return this.cache[key];
  },
  set: function(key, val) {
    this.cache[key] = val;
  },
  reset: function() {
    this.getCallHits = {};
    this.cache = {};
  },
  has: function(key) {
    this.cache[key] !== undefined;
  },
  del: function(key) {
    delete this.cache[key];
  },
  wasCacheHit: function(key) {
    return !!this.getCallHits[key];
  }
};
