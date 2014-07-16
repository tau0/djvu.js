var lib = {
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
    return (a & 0xFFFF + 65536) & 0xFFFF;
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
      if (n < 0 || n >= data.length << 5) {
        return;
      }
      data[n >> 5] |= 1 << (n & 0x1F);
      data[n >> 5] ^= 1 << (n & 0x1F);
      data[n >> 5] |= b << (n & 0x1F);
    };
    this.getBit = function (n) {
      n = n | 0;
      if (n < 0 || n >= data.length << 5) {
        return;
      }
      return (data[n >> 5] >> (n & 0x1F)) & 1;
    };
    this.resize(n);
  }
};
