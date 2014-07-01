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
  this.library = new SymbolLibrary();
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

  this.draw = function (config) {
    for (var x = 0; x < width; ++x) {
      for (var y = 0; y < height; ++y) {
        if (this.getPixel(x, y)) {
          config.canvas.put(x + config.position.x, y + config.position.y);
        }
      }
    }
  };

  this.decodeDirectSymbol = function () {
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
        for (var i = 9; i >= 0; --i) {
          context = context * 2 + this.getPixel(x + dx[i], y + dy[i]);
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

  this.decodeRefinedSymbol = function (librarySymbol) {
    width = librarySymbol.getWidth() + jb2.zp.decodeWithNumContext(jb2.symbolWidthDifference);
    height = librarySymbol.getHeight() + jb2.zp.decodeWithNumContext(jb2.symbolHeightDifference);
    lib.log(width, height);

    var dx = [-1, 0,  1,  -1,    0, -1, 0,  1,  -1, 0,  1];
    var dy = [-1, -1, -1, -0,   -1, 0,  0,  0,  1,  1,  1];
    var align = {
      x : Math.floor((librarySymbol.getWidth() - 1) / 2) - Math.floor((width - 1) / 2),
      y : Math.floor((librarySymbol.getHeight() - 1) / 2) - Math.floor((height - 1) / 2),
    };
    for (var y = 0; y < height; ++y) {
      var s = "";
      for (var x = 0; x < width; ++x) {
        var context = 0;
        for (var i = 10; i >= 4; --i) {
          context *= 2;
          context += librarySymbol.getPixel(x + align.x + dx[i], y + align.y + dy[i]);
        }
        for (var j = 3; j >= 0; --j) {
          context *= 2;
          context += this.getPixel(x + dx[i], y + dy[i]);
        }
        data[y * width + x] = jb2.zp.decodeWithBitContext(jb2.symbolRefinementContexts[context]);
        s += data[y * width + x];
      }
      lib.log(y + ")" + s);
    }
  };

  // left top origin
  this.getPixel = function (x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return 0;
    }
    return data[y * width + x];
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
        data[y * _width + x] = this.getPixel(x + left, y + top);
      }
    }
    data.length = _width * _height;
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
