define(function () {
  function clearArray(array) {
    while (array.length > 0) {
        array.shift();
    }
  }

  function assert(value) {
    if (!value) {
      throw error.assertError;
    }
  }

  function log() {
    if (DEBUG) {
      console.log.apply(console, arguments);
    }
  }

  return {
    assert: assert,
    clearArray: clearArray,
    log: log
  };
});
