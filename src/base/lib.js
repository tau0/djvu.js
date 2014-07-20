var lib = {
  getLZ16Array: function () {
    var res = [];
    var prev = 0x10000;
    var fill = 0;
    for (var i = 0x10000; i-- !== 0; ) {
      res[i] = fill;
      if ((i << 1) === prev) {
        fill++;
        prev = i;
      }
    }
    return res;
  },
  getTZ16Array: function () {
    var res = [];
    res[0] = 16;
    res[1] = 0;
    for (var i = 2; i < 0x10000; ++i) {
      res[i] = (i & 1 === 1) ? 0 : res[i >> 1] + 1;
    }
    return res;
  },
  clearArray: function(array) {
    array.length = 0;
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
    return (a & 0xFFFF);
  },

  bitArray : function (n) {
    var data = [];
    var bitNum = 32;

    this.resize = function (n) {
      var oldLength = data.length;
      data.length = Math.ceil(n / 32);
      for (var i = oldLength; i < data.length; ++i) {
        data[i] = 0;
      }
    };

    this.setBit = function (n, b) {
      n = n | 0;
      data[n >> 5] &= ~(1 << (n & 0x1F));
      data[n >> 5] |= b << (n & 0x1F);
    };

    this.getBit = function (n) {
      n = n | 0;
      return (data[n >> 5] >> (n & 0x1F)) & 1;
    };

    this.setWord = function (n, w) {
      n = n | 0;
      data[n >> 5] = w;
    };

    this.getWord = function (n) {
      n = n | 0;
      return data[n >> 5];
    };

    this.resize(n);
  }
};
