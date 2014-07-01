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
  },
  // TODO: Some buggy magic.
  toUnsignedShort: function (a) {
    return (a % 65536 + 65536) % 65536;
  }
};
