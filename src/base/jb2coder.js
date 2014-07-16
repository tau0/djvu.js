var JB2Decoder = function (config) {
  this.imageSize = new ZPNumContext(0, 262142);
  this.recordType = new ZPNumContext(0, 11);
  this.bigPositiveNumber = 262142;
  this.symbolWidth = new ZPNumContext(0, this.bigPositiveNumber);
  this.symbolHeight = new ZPNumContext(0, this.bigPositiveNumber);
  this.symbolWidthDifference = new ZPNumContext(-this.bigPositiveNumber, this.bigPositiveNumber);
  this.symbolHeightDifference = new ZPNumContext(-this.bigPositiveNumber, this.bigPositiveNumber);
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
  this.matchingSymbolIndex = new ZPNumContext(0, 0);
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

    return coords;
  };
  this.library = new SymbolLibrary();
};

var Symbol = function (config) {
  var data = new lib.bitArray(0);
  var jb2 = config.jb2 || null;
  var width;
  var height;

  this.getWidth = function () {
    return width;
  };

  this.getHeight = function () {
    return height;
  };

  this.draw = function (config) {
    for (var x = 0; x < width; ++x) {
      for (var y = 0; y < height; ++y) {
        if (this.getPixel(x, y)) {
          config.canvas.put(x + config.position.x, y + config.position.y);
        }
      }
    }
  };

  var ddx = [-1,	0,  1, -2, -1,  0, 1,  2, -2, -1];
  var ddy = [-2, -2, -2, -1, -1, -1,-1, -1,  0,  0];
  var dfx = [-1,  0,  1, -1,  0, -1, 0,  1, -1,  0,  1];
  var dfy = [-1, -1, -1, -0, -1,  0, 0,  0,  1,  1,  1];

  this.decodeDirectSymbol = function () {
    width = jb2.zp.decodeWithNumContext(jb2.symbolWidth);
    height = jb2.zp.decodeWithNumContext(jb2.symbolHeight);
    data.resize(width * height);
    var context = 0;
    var lastBit;

    for (var y = 0; y < height; ++y) {
      lastBit = 0;
      for (var x = 0; x < width; ++x) {
        context =
          ((context >> 1) & 0x37B) |
          (this.getPixel(x + 1, y - 2) << 2) |
          (this.getPixel(x + 2, y - 1) << 7) |
          (lastBit << 9);

        lastBit = jb2.zp.decodeWithBitContext(jb2.symbolDirectContexts[context]);
        data.setBit(y * width + x, lastBit);
      }
      context = 0 |
        (this.getPixel(0, y - 1) << 2) |
        (this.getPixel(0, y) << 6) |
        (this.getPixel(1, y) << 7);
    }
  };

  this.decodeRefinedSymbol = function (librarySymbol) {
    width = librarySymbol.getWidth() + jb2.zp.decodeWithNumContext(jb2.symbolWidthDifference);
    height = librarySymbol.getHeight() + jb2.zp.decodeWithNumContext(jb2.symbolHeightDifference);
    data.resize(width * height);

    var align = {
      x : ((librarySymbol.getWidth() - 1) >> 1) - ((width - 1) >> 1),
      y : ((librarySymbol.getHeight() - 0) >> 1) - ((height - 0) >> 1),
    };
    for (var y = 0; y < height; ++y) {
      for (var x = 0; x < width; ++x) {
        var context = 0;
        for (var i = 10; i >= 4; --i) {
          context *= 2;
          context += librarySymbol.getPixel(x + align.x + dfx[i], y + align.y + dfy[i]);
        }
        for (var j = 3; j >= 0; --j) {
          context *= 2;
          context += this.getPixel(x + dfx[j], y + dfy[j]);
        }
        data.setBit(y * width + x, jb2.zp.decodeWithBitContext(jb2.symbolRefinementContexts[context]));
      }
    }
  };

  // left top origin
  this.getPixel = function (x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return 0;
    }
    return data.getBit(y * width + x);
  };

  this.crop = function () {
    var left = -1;
    var top = -1;
    var _width = width;
    var _height = height;
    var i;
    var brk = false;
    while (!brk) {
      left++;
      for (i = top; i < _height; ++i) {
        if (this.getPixel(left, i)) {
          brk = true;
          break;
        }
      }
    }
    brk = false;
    while (!brk) {
      _width--;
      for (i = top; i < _height; ++i) {
        if (this.getPixel(_width, i)) {
          _width++;
          brk = true;
          break;
        }
      }
    }
    brk = false;
    while (!brk) {
      top++;
      for (i = left; i < _width; ++i) {
        if (this.getPixel(i, top)) {
          brk = true;
          break;
        }
      }
    }
    brk = false;
    while (!brk) {
      _height--;
      for (i = left; i < _width; ++i) {
        if (this.getPixel(i, _height)) {
          _height++;
          brk = true;
          break;
        }
      }
    }
    _width -= left;
    _height -= top;
    for (var y = 0; y < _height; ++y) {
      for (var x = 0; x < _width; ++x) {
        data.setBit(y * _width + x, this.getPixel(x + left, y + top));
      }
    }
    data.resize(_width * _height);
    width = _width;
    height = _height;
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

var SymbolLibrary = function (config) {
  var data = [];
  this.addSymbol = function (symbol) {
    data.push(symbol);
  };
  this.getByIndex = function (index) {
    if (index < 0 || index >= data.length) {
      throw "out of borders";
    }
    return data[index];
  };
  this.getSize= function () {
    return data.length;
  };
};
