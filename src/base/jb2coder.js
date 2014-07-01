var JB2Decoder = function (config) {
  this.imageSize = new ZPNumContext(0, 262142);
  this.recordType = new ZPNumContext(0, 11);
  this.bigPositiveNumber = 262142;
  this.symbolWidth = new ZPNumContext(0, this.bigPositiveNumber);
  this.symbolHeight = new ZPNumContext(0, this.bigPositiveNumber);
  this.eventualImageRefinement = { value: 0 };
  this.symbolColumnNumber = new ZPNumContext(0, 0);
  this.symbolRowNumber= new ZPNumContext(0, 0);
  this.symbolDirectContexts = [];
  this.symbolRefinementContexts = [];
  this.offsetTypeContext = { value : 0 };
  this.newLineColumnOffset = new ZPNumContext(-this.bigPositiveNumber, this.bigPositiveNumber);
  this.newLineRowOffset = new ZPNumContext(-this.bigPositiveNumber, this.bigPositiveNumber);
  this.sameLineColumnOffset = new ZPNumContext(-this.bigPositiveNumber, this.bigPositiveNumber);
  this.sameLineRowOffset = new ZPNumContext(-this.bigPositiveNumber, this.bigPositiveNumber);
  var i;
  for (i = 0; i < 1024; ++i) {
    this.symbolDirectContexts[i] = { value : 0 };
  }
  for (i = 0; i < 2048; ++i) {
    this.symbolRefinementContexts[i] = { value : 0 };
  }

  // TODO me
  this.reset = function () {
  };

  var first = new JB2Rect(-1, 0, 0, 1);
  var prev1 = new JB2Rect(-1, 0, 0, 1);
  var prev2 = new JB2Rect(-1, 0, 0, 1);
  var prev3 = new JB2Rect(-1, 0, 0, 1);

  this.data = config.data || null;
  this.getc = config.getter || undefined;
  this.ptr = config.ptr || null;

  this.zp = new ZPDecoder(config);
  this.decodeRecordType = function () {
    return this.zp.decodeWithNumContext(this.recordType);
  };

  var lineCounter = 0 ;
  this.decodeSymbolPosition = function (config) {
    var w = config.width;
    var h = config.height;
    var coords = { x : 0, y : 0 };

    if (this.zp.decodeWithBitContext(this.offsetTypeContext)) {
      coords.x = first.left + this.zp.decodeWithNumContext(this.newLineColumnOffset);
      var dy = this.zp.decodeWithNumContext(this.newLineRowOffset);
      coords.y = first.top + first.height - dy - 1;
      lineCounter = 1;
      first.left = coords.x;
      first.top = coords.y;
      first.width = w;
      first.height = h;
      prev1 = first.copy();

    } else {
      coords.x = prev1.left + prev1.width - 1 + this.zp.decodeWithNumContext(this.sameLineColumnOffset);
      lib.log("~~", prev1.left, prev1.width);
      var baseLine;
      if (lineCounter < 3) {
        baseLine = first.top + first.height;
      } else {
        var b1 = prev1.top + prev1.height;
        var b2 = prev2.top + prev2.height;
        var b3 = prev3.top + prev3.height;
        baseLine = [b1, b2, b3].sort()[1];
      }
      coords.y = baseLine - h - this.zp.decodeWithNumContext(this.sameLineRowOffset);
      lineCounter++;
      prev3 = prev2;
      prev2 = prev1;
      prev1 = new JB2Rect(coords.x, coords.y, w, h);
    }
    lib.log("!", coords.x, coords.y);

    return coords;
  };
};

var Symbol = function (config) {
  var data = [];
  var jb2 = config.jb2 || null;
  var width;
  var height;

  this.getWidth = function () {
    return width;
  };

  this.getHeight = function () {
    return height;
  };

  this.decodeDirectSymbol = function (config) {
    width = jb2.zp.decodeWithNumContext(jb2.symbolWidth);
    height = jb2.zp.decodeWithNumContext(jb2.symbolHeight);
    lib.log(width, height);

    var dx = [-1, 0,  1,  -2, -1, 0,  1,  2,  -2, -1];
    var dy = [-2, -2, -2, -1, -1, -1, -1, -1, 0,  0];
    for (var y = 0; y < height; ++y) {
      var s = "";
      var ctxs = "";
      for (var x = 0; x < width; ++x) {
        var context = 0;
        for (var i = 0; i < 10; ++i) {
          context |= this.getPixel(x + dx[i], y + dy[i]) << i;
        }
        if (y == 244 || y == 243) {
          ctxs += context + "(" + jb2.symbolDirectContexts[context].value + ")";
        }
        data[y * width + x] = jb2.zp.decodeWithBitContext(jb2.symbolDirectContexts[context]);
        s += data[y * width + x];
      }
      lib.log(y + ")" + s);
      if (y == 244 || y == 243) {
        lib.log(ctxs);
      }
    }
  };

  // left top origin
  this.getPixel = function (x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return 0;
    }
    return data[y * width + x];
  };
};

var JB2Rect = function (left, top, width, height) {
  this.left = left;
  this.top = top;
  this.width = width;
  this.height = height;

  this.copy = function () {
    return new JB2Rect(this.left, this.top, this.width, this.height);
  };
};

