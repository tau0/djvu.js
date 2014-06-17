var lib = {
  clearArray: function(array) {
    while (array.length > 0) {
        array.shift();
    }
  },
  assert: function(value) {
    if (!value) {
      throw error.assertError;
    }
  },
  log: function() {
    if (DEBUG) {
      console.log.apply(console, arguments);
    }
  }
};
