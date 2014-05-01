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
  return {
    assert: assert,
    clearArray: clearArray
  };
});
