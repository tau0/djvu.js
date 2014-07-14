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
    return (a % 65536 + 65536) % 65536;
  },
  initString : function (n) {
    n = Math.round(n);
    var ans = "", s = "0";
    while (n) {
      if (n % 2 == 1) {
        ans = ans.concat(s);
      }
      n = Math.floor(n / 2);
      s = s.concat(s);
    }
    return ans;
  },
  UsualArray : function (n) {
    var data = [];
    this.resize = function (n) {
      var oldLength = data.length;
      data.length = n;
      for (var i = oldLength; i < data.length; ++i) {
        data[i] = 0;
      }
    };
    this.setBit = function (n, b) {
      data[n] = b;
    };
    this.getBit = function (n) {
      return data[n];
    };
    this.resize(n);
  },
  bitArray : function (n) {
    var data = [];
    var bitNum = 32, bitNumLog = 5;
    this.resize = function (n) {
      var oldLength = data.length;
      data.length = Math.ceil(n / bitNum);
      for (var i = oldLength; i < data.length; ++i) {
        data[i] = 0;
      }
    };
    this.setBit = function (n, b) {
      if (b) {
        b = 1;
      } else {
        b = 0;
      }
      n = Math.round(n);
      if (n < 0 || n >= data.length * bitNum) {
        throw "bitArray: out of bounds";
      }
      data[n >> bitNumLog] |= 1 << (n % bitNum);
      data[n >> bitNumLog] ^= 1 << (n % bitNum);
      data[n >> bitNumLog] |= b << (n % bitNum);
    };
    this.getBit = function (n) {
      n = Math.round(n);
      if (n < 0 || n >= data.length * bitNum) {
        throw "bitArray: out of bounds";
      }
      return (data[n >> bitNumLog] >> (n % bitNum)) & 1;
    };
    this.resize(n);
  }
};
