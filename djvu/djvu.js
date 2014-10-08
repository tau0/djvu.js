var CanvasUtils = function (config) {
  var indent = 512;
  var data = null;
  var width = 0;
  var height = 0;

  var rowSize = function () {
    return Math.floor((width + 31) / 32) * 4;
  };

  var saveInt = function (offset, number) {
    for (var i = 0; i < 4; ++i) {
      data[offset + i] = 0xff & (number >> (i * 8));
    }
  };

  var makeHeader = function () {
    //magic number
    data[0] = 0x42;
    data[1] = 0x4d;
    saveInt(2, data.length);
    saveInt(10, indent);
    //size of DIB header
    saveInt(14, 40);
    saveInt(18, width);
    saveInt(22, -height);
    //must be 1
    data[26] = 1;
    //number of pixels encoding colors
    data[28] = 1;
    //pixels in meter horizontally
    data[38] = 255;
    //pixels in meter vertically
    data[42] = 255;
    //using all possible colors
    data[46] = 0;
    //color table
    data[54] = 0xff;
    data[55] = 0xff;
    data[56] = 0xff;
    //data[58 .. 60] = 0x00;
  };

  this.put = function (x, y, b) {
    var yIndent = rowSize() * y;
    var i = indent + yIndent + (x >> 3);
    data[i] |= b << (7 - (x & 7));
  };

  this.render = function () {
    makeHeader();
    var blob = new Blob([ data ], { "type" : "image\/bmp" });
    return URL.createObjectURL(blob);
  };

  this.resize = function (config){
    width = config.width;
    height = config.height;
    data = new Uint8Array(indent + height * rowSize());
  };

  this.clean = function () {
    data = null;
  };
};

var error = {
  incorrectInput: 'Incorrect input',
  assertError: 'Assert error'
};

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
  this.lz = lib.getLZ16Array();
  this.tz = lib.getTZ16Array();

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
  var width32;
  var height;
  var topOffset = 0;
  var leftOffset = 0;
  var lz = jb2.lz;
  var tz = jb2.tz;

  this.getRealWidth = function () {
    return width - leftOffset;
  };

  this.getRealHeight = function () {
    return height - topOffset;
  };

  this.draw = function (config) {
    for (var y = topOffset; y < height; ++y) {
      for (var x = leftOffset; x < width; ++x) {
        config.canvas.put(x - leftOffset + config.position.x, y - topOffset + config.position.y, getPixel1(x, y));
      }
    }
  };

  var dfx = [-1,  0,  1, -1,  0, -1, 0,  1, -1,  0,  1];
  var dfy = [-1, -1, -1, -0, -1,  0, 0,  0,  1,  1,  1];

  this.decodeDirectSymbol = function () {
    width = jb2.zp.decodeWithNumContext(jb2.symbolWidth);
    width32 = (width + 0x1F) & ~0x1F;
    height = jb2.zp.decodeWithNumContext(jb2.symbolHeight);
    data.resize(width32 * height);
    var context = 0;
    var lastBit;
    var lastWord;

    for (var y = 0; y < height; ++y) {
      lastBit = 0;
      lastWord = 0;
      for (var x = 0; x < width; ++x) {
        context =
          ((context >> 1) & 0x37B) |
          (getPixel2(x + 1, y - 2) << 2) |
          (getPixel1(x + 2, y - 1) << 7) |
          (lastBit << 9);

        lastBit = jb2.zp.decodeWithBitContext(jb2.symbolDirectContexts[context]);
        lastWord |= lastBit << (x & 31);
        if ((x & 31) === 31) {
          data.setWord(y * width32 + x, lastWord);
          lastWord = 0;
        }
      }
      if ((width & 31) !== 0) {
        data.setWord(y * width32 + x, lastWord);
        lastWord = 0;
      }
      context = 0 |
        (getPixel2(0, y - 1) << 2) |
        (getPixel1(0, y) << 6) |
        (getPixel1(1, y) << 7);
    }
  };

  this.decodeRefinedSymbol = function (librarySymbol) {
    width = librarySymbol.getRealWidth() + jb2.zp.decodeWithNumContext(jb2.symbolWidthDifference);
    width32 = (width + 0x1F) & ~0x1F;
    height = librarySymbol.getRealHeight() + jb2.zp.decodeWithNumContext(jb2.symbolHeightDifference);
    data.resize(width32 * height);

    var align = {
      x : leftOffset + ((librarySymbol.getRealWidth() - 1) >> 1) - ((this.getRealWidth() - 1) >> 1),
      y : topOffset + ((librarySymbol.getRealHeight() - 0) >> 1) - ((this.getRealHeight()- 0) >> 1),
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
        data.setBit(y * width32 + x, jb2.zp.decodeWithBitContext(jb2.symbolRefinementContexts[context]));
      }
    }
  };

  // left top origin
  this.getPixel = function (x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return 0;
    }
    return data.getBit(y * width32 + x);
  };

  var getPixelCache1;
  var getPixelPosition1 = -1;
  var getPixel1 = function (x, y) {
    var coord = (y * width32 + x);
    var pos =  coord & ~31;
    if (pos !== getPixelPosition1) {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return 0;
      }
      getPixelPosition1 = pos;
      getPixelCache1 = data.getWord(pos);
    }
    return (getPixelCache1 >> (coord & 31)) & 1;
  };

  var getPixelCache2;
  var getPixelPosition2 = -1;
  var getPixel2 = function (x, y) {
    var coord = (y * width32 + x);
    var pos = coord & ~31;
    if (pos !== getPixelPosition2) {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return 0;
      }
      getPixelPosition2 = pos;
      getPixelCache2 = data.getWord(pos);
    }
    return (getPixelCache2 >> (coord & 31)) & 1;
  };

  this.crop = function () {
    var left = 0;
    var top = 0;
    var _width = width;
    var _height = height;
    var i;
    var now, worst, word;

    worst = 0x20;
    while (worst == 0x20) {
      for (i = top; i < _height; ++i) {
        word = data.getWord(left + width32 * i);
        if (word & 0xFFFF) {
          now = 0;
          word = word & 0xFFFF;
        } else {
          now = 0x10;
          word = word >>> 0x10;
        }
	// Fucking crazy bro! LEADINGZEROIS 0000000000111
	//			                      	    ++++++++++---
	// TRAILING ZEROS 		    0000000000110
	//            				    ------------+
	// our bit array INT32REVERSED|INT32REVERSED|...
	// So symbol |***| is 00000000...000111, TZ: 0!!!
	// And symbol |0**| is 00000000...000110, TZ: 1!!!
        now += /*not fucking LZ*/ tz[word];
        worst = Math.min(worst, now);
      }
      left += worst;
    }

    var brk = false;
    while (!brk) {
      _width--;
      for (i = top; i < _height; ++i) {
        if (data.getBit(_width + width32 * i)) {
          _width++;
          brk = true;
          break;
        }
      }
    }

    brk = false;
    top--;
    while (!brk) {
      top++;
      for (i = left; i < _width; i += 0x20) {
        if (data.getWord(i + width32 * top)) {
          brk = true;
          break;
        }
      }
    }

    brk = false;
    while (!brk) {
      _height--;
      for (i = left; i < _width; i += 0x20) {
        if (data.getWord(i + width32 * _height)) {
          _height++;
          brk = true;
          break;
        }
      }
    }
    width = _width;
    height = _height;
    leftOffset = left;
    topOffset = top;
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


// ================================ Fetcher ======================================================
//
//
//
var Fetcher = function (config, manifest) {
  this.downloadPage = function (pageNumber, callback) {

    var left = parseInt(this.manifest.files[pageNumber].offset);
    var size = parseInt(this.manifest.files[pageNumber].size);
    var right = left + size - 1;

    var filePreload = new XMLHttpRequest();
    filePreload.open("GET", config.url, true);
    filePreload.setRequestHeader("Range", "bytes=" + left + "-" + right);
    filePreload.responseType = "arraybuffer";
    filePreload.onload = function () {
      var arrayBuffer = filePreload.response;
      var byteArray = arrayBuffer.byteLength ? new Uint8Array(arrayBuffer) : arrayBuffer;
      callback(byteArray);
    };
    filePreload.send();
  };

  this.processManifest = function (json) {
    var pages = [];
    var dictionaries = {};
    if (json.id == "FORM:DJVM" && json.internalChunks) {
      var chunks = json.internalChunks;
      for (var i in chunks) {
        if (chunks[i].type == "dictionary") {
          var dict = {};
          dict.name = chunks[i].name;
          dict.size = chunks[i].size;
          dict.offset = chunks[i].offset;
          if (dict.name) {
            dictionaries[dict.name] = dict;
          }
        }
        if (chunks[i].type == "page") {
          var page = {};
          var valid = false;
          page.offset = chunks[i].offset;
          page.size = chunks[i].size;

          page.number = chunks[i].pageNumber;
          for (var j in chunks[i].internalChunks) {
            var chunkPart = chunks[i].internalChunks[j];
            switch (chunkPart.id) {
              case "Sjbz":
                isValid = true;
              break;
              case "INCL":
                if (chunkPart.info in dictionaries) {
                  page.dictionary = dictionaries[chunkPart.info];
                }
              break;
              default:
            }
          }
          pages[page.number - 1] = page;
        }
      }
    }
    return pages;
  };
  this.manifest = this.processManifest(manifest);

};

// ============================= Renderer ========================================================
//
//
//
var Renderer = function (config, manifest) {
  this.canvas = config.canvas || null;
  this.getc = function () {
    return this.data[this.pointer++];
  };

  this.readFourByte = function () {
    var result = this.getc() << 24;
    result |= this.getc() << 16;
    result |= this.getc() << 8;
    result |= this.getc();
    return result;
  };

  this.skipInChunk = function (chunk, length) {
    var current = chunk;
    while (current) {
      current.skipped += length;
      current = chunk.parent;
    }
  };

  this.getChildChunk = function (chunk, parent) {
    chunk.id = this.readFourByte();
    chunk.length = this.readFourByte();
    chunk.skipped = 0;
    chunk.parent = parent;
    this.skipInChunk(parent, 8);
  };

  this.skipToNextSiblingChunk = function (chunk) {
    this.skipInChunk(chunk.parent, chunk.length + 8);
    this.pointer += (chunk.length + 1) & ~1;
    chunk.id = this.readFourByte();
    chunk.length = this.readFourByte();
    chunk.skipped = 0;
  };

  this.findSiblingChunk = function (chunk, id) {
    while (chunk.id != id) {
      if (chunk.parent && chunk.parent.skipped >= chunk.parent.length){
        throw 'chunkNotFound';
      }
      this.skipToNextSiblingChunk(chunk);
    }
  };

  this.locateJB2Chunk = function () {
    var FORM = {};
    var Sjbz = {};
    this.getChildChunk(FORM, undefined);
    this.findSiblingChunk(FORM, CHUNK_ID_FORM);
    if (this.readFourByte() != ID_DJVU) {
      throw "can't find ID_DJVU Chunk";
    }
    this.skipInChunk(FORM, 4);
    this.getChildChunk(Sjbz, FORM);
    this.findSiblingChunk(Sjbz, CHUNK_ID_Sjbz);
    return Sjbz;
  };

  this.records = {
    jb2_start_of_image: 0,
    jb2_new_symbol_add_to_image_and_library: 1,
    jb2_new_symbol_add_to_library_only: 2,
    jb2_new_symbol_add_to_image_only: 3,
    jb2_matched_symbol_with_refinement_add_to_image_and_library: 4,
    jb2_matched_symbol_with_refinement_add_to_library_only: 5,
    jb2_matched_symbol_with_refinement_add_to_image_only: 6,
    jb2_matched_symbol_copy_to_image_without_refinement: 7,
    jb2_non_symbol_data: 8,
    jb2_require_dictionary_or_reset: 9,
    jb2_comment: 10,
    jb2_end_of_data: 11
  };

  this.loadJB2 = function (target) {
    var st = (new Date()).getTime();
    var jb2 = new JB2Decoder({
      getter: this.getc,
      data: this.data,
      ptr: this.pointer
    });
    var zp = jb2.zp;

    var record = jb2.decodeRecordType();
    var dictionary = 0;

    if (record == this.records.jb2_require_dictionary_or_reset) {
      dictionary = zp.decode(jb2.requredDictionarySize);
      record = jb2.decodeRecordType();
    }

    if (record != this.records.jb2_start_of_image) {
      throw "Something wrong with first record in jb2 chunk";
    }

    var width = zp.decodeWithNumContext(jb2.imageSize);
    var height = zp.decodeWithNumContext(jb2.imageSize);
    zp.decodeWithBitContext(jb2.eventualImageRefinement); // TODO: WTF? And why it's here?
    jb2.symbolColumnNumber.setInterval(1, width);
    jb2.symbolRowNumber.setInterval(1, height);

    this.canvas.resize({ width: width, height: height });

    var libCount = 0;
    var symbol = new Symbol({ jb2 : jb2 });
    var position;
    var index;
    var brk = false;
    while(!brk) {
      record = jb2.decodeRecordType();
      switch(record) {
        case this.records.jb2_new_symbol_add_to_image_and_library:
          symbol = new Symbol({ jb2 : jb2 });
          symbol.decodeDirectSymbol();
          position = jb2.decodeSymbolPosition({
            width : symbol.getRealWidth(),
            height : symbol.getRealHeight()
          });
          symbol.draw({
            canvas: this.canvas,
            position: position
          });
          symbol.crop();
          jb2.library.addSymbol(symbol);
        break;
        case this.records.jb2_matched_symbol_with_refinement_add_to_image_and_library:
          jb2.matchingSymbolIndex.setInterval(0, jb2.library.getSize() - 1);
          index = zp.decodeWithNumContext(jb2.matchingSymbolIndex);

          symbol = new Symbol({ jb2 : jb2 });
          symbol.decodeRefinedSymbol(jb2.library.getByIndex(index));
          position = jb2.decodeSymbolPosition({
            width : symbol.getRealWidth(),
            height : symbol.getRealHeight()
          });
          symbol.draw({
            canvas: this.canvas,
            position: position
          });
          symbol.crop();
          jb2.library.addSymbol(symbol);
        break;
        case this.records.jb2_matched_symbol_copy_to_image_without_refinement:
          jb2.matchingSymbolIndex.setInterval(0, jb2.library.getSize() - 1);
          index = zp.decodeWithNumContext(jb2.matchingSymbolIndex);
          symbol = jb2.library.getByIndex(index);
          position = jb2.decodeSymbolPosition({
            width: symbol.getRealWidth(),
            height: symbol.getRealHeight()
          });
          symbol.draw({
            canvas: this.canvas,
            position: position
          });
        break;
        case this.records.jb2_end_of_data:
          lib.log("time: " + ((new Date()).getTime() - st));
          var img = document.getElementById(target);
          img.src = this.canvas.render();
          jb2 = null;
          zp = null;
          brk = true;
        break;
        default:
          document.getElementById(target).src = this.canvas.render();
          throw "Record not defined here: " + record;
      }
    }
  };

  this.render = function (target, pageNumber) {
    this.fetcher.downloadPage(pageNumber, function (binaryData) {
      this.pointer = 0;
      this.data = binaryData;
      var jb2chunk = this.locateJB2Chunk();
      return this.loadJB2(target);
    }.bind(this));
  };

  this.fetcher = new Fetcher(config, manifest);
};
// Constants region:
// // ============================================================================================

var CHUNK_ID_FORM = 0x464F524D;
var CHUNK_ID_Sjbz = 0x536A627A;
var ID_DJVU = 0x444A5655;

// ==============================================================================================

// ========================================== main ==========================================
//
//
//
//
/*
*/

/* global error: false, lib: false */
// ========================================= ZPNumContext =======================================
//
//
//

var ZPNumContext = function (amin, amax) {
  this.setInterval = function (newMin, newMax) {
    if (newMin > newMax) {
      throw error.incorrectInput;
    }

    this.min = newMin;
    this.max = newMax;
  };

  this.reset = function () {
    lib.clearArray(this.nodes);
    lib.clearArray(left);
    lib.clearArray(right);
    lib.init();
  };

  this.nodes = [];
  var n;
  var allocated;
  var left = [];
  var right = [];

  this.newNode = function () {
    this.nodes[n] = { value: 0 };
    left[n] = 0;
    right[n] = 0;
    return n++;
  };

  this.getLeft = function (i) {
    if (i >= n) {
      throw error.incorrectInput;
    }

    var result = left[i];
    if (result) {
      return result;
    }

    result = this.newNode();
    left[i] = result;
    return result;
  };

  this.getRight = function (i) {
    if (i >= n) {
      throw  error.incorrectInput;
    }

    var result = right[i];
    if (result) {
      return result;
    }

    result = this.newNode();
    right[i] = result;
    return result;
  };

  this.init = function () {
    n = 1;
    this.nodes[0] = { value: 0 };
    left[0] = right[0] = 0;
  };

  if (amin > amax) {
    throw error.incorrectInput;
  }

  this.min = amin;
  this.max = amax;
  this.init();
};

// ============================= ZPCoder =======================================================
//
//
//
var ZPDecoder = function (input) {
  // public:
  this.data = input.data || null;
  this.ptr = input.ptr || 0;

  this.decodeWithoutContext = function () {
    var dummy = 0;
    return this.decodeSub(dummy, 0x8000 + (a >> 1));
  };

  this.decodeWithBitContext = function (context) {
    var z = a + ZP_p_table[context.value];
    if (z <= fence) {
      a = z;
      return context.value & 1;
    }
    var d = 0x6000 + ((z + a) >> 2);
    if (z > d) {
      z = d;
    }
    return this.decodeSub(context, z);
  };

  this.nextByte = function () {
    if(bytesLeft === 0 || this.ptr === this.data.length) {
      throw 'no data';
    }
    var c = this.data[this.ptr++];
    --bytesLeft;
    return c;
  };

  this.open = function () {
    try {
      byte = this.nextByte();
    } catch (e) {
      byte = 0xff;
    }
    code = byte << 8;

    try {
      byte = this.nextByte();
    } catch (e) {
      byte = 0xff;
    }
    code = code | byte;

    delay = 25;
    scount = 0;
    this.preload();

    fence = code;
    if (code >= 0x8000) {
      fence = 0x7fff;
    }
  };

  this.preload = function () {
    while (scount <= 24) {
      try {
        byte = this.nextByte();
      } catch(e) {
        byte = 0xff;
        delay--;
        lib.assert(delay);
      }

      buffer = (buffer << 8) | byte;
      scount += 8;
    }
  };

  this.decodeWithNumContext = function (context) {
    var negative = false;
    var cutoff = 0;
    var range = 0xFFFFFFFF;
    var currentNode = 0;
    var phase = 1;
    var low = context.min;
    var high = context.max;

    while(range != 1)
    {
      var decision;

      decision = low >= cutoff || (high >= cutoff && this.decodeWithBitContext(context.nodes[currentNode]));
      currentNode = decision ? context.getRight(currentNode) : context.getLeft (currentNode);

      switch (phase) {
        case 1:
          negative = !decision;
          if (negative) {
              var temp = - low - 1;
              low = - high - 1;
              high = temp;
          }
          phase = 2;
          cutoff = 1;
          break;
        case 2:
          if (!decision) {
            phase = 3;
            range = (cutoff + 1) / 2;
            if (range == 1)
              cutoff = 0;
            else
              cutoff -= range / 2;
          } else {
            cutoff += cutoff + 1;
          }
          break;
        case 3:
          range /= 2;
          if (range != 1) {
            if (!decision)
              cutoff -= range / 2;
            else
              cutoff += range / 2;
          } else if (!decision) {
            cutoff--;
          }
          break;
      }
    }
    return negative ? -cutoff - 1 : cutoff;
  };

  this.decodeSub = function (context, z) {
    var bit = context.value & 1;
    if (z > code)
    {
      z = 0x10000 - z;
      a += z;
      code = code + z;

      context.value = ZP_dn_table[context.value];

      var shift = ffz(a);
      scount -= shift;
      a = lib.toUnsignedShort(a << shift);
      code = lib.toUnsignedShort((code << shift) | ((buffer >> scount) & ((1 << shift) - 1)));
      if (scount < 16) {
        this.preload();
      }

      fence = code;
      if (code >= 0x8000) {
        fence = 0x7fff;
      }
      return bit ^ 1;
    } else {
      if (a >= ZP_m_table[context.value])
        context.value = ZP_up_table[context.value];

      scount -= 1;
      a = lib.toUnsignedShort(z << 1);
      code = lib.toUnsignedShort((code << 1) | ((buffer >> scount) & 1));
      if (scount < 16) {
        this.preload();
      }

      fence = code;
      if (code >= 0x8000) {
        fence = 0x7fff;
      }
      return bit;
    }
  };



  // private:
  var a = 0;
  var code;
  var fence = 0;
  var buffer;
  var byte;
  var scount;
  var delay;
  var bytesLeft = input.length;

  function ffz(value) {
    return value >= 0xff00 ? ZP_FFZ_table[value & 0xff] + 8 : ZP_FFZ_table[(value >> 8) & 0xff];
  }

  this.open();
};


//====================================== Tables ==============================================
//
//
//

function initTables() {
  for (var i = 0; i < 256; i++) {
    if (ZP_m_table[i] == 0xFFFF) {
      for (var j = i; j < 256; j++) {
        ZP_m_table[j] = 0;
      }
      break;
    }
  }
}

function initFfzTable() {
  for (var i = 0; i < 256; i++) {
    ZP_FFZ_table[i] = 0;
    for (var j = i; j & 0x80; j <<= 1) {
      ZP_FFZ_table[i] += 1;
    }
  }
}

var ZP_FFZ_table = [];

var ZP_p_table = [
  0x8000,0x8000,0x8000,0x6bbd,0x6bbd,0x5d45,0x5d45,0x51b9,0x51b9,0x4813,0x4813,
  0x3fd5,0x3fd5,0x38b1,0x38b1,0x3275,0x3275,0x2cfd,0x2cfd,0x2825,0x2825,0x23ab,
  0x23ab,0x1f87,0x1f87,0x1bbb,0x1bbb,0x1845,0x1845,0x1523,0x1523,0x1253,0x1253,
  0x0fcf,0x0fcf,0x0d95,0x0d95,0x0b9d,0x0b9d,0x09e3,0x09e3,0x0861,0x0861,0x0711,
  0x0711,0x05f1,0x05f1,0x04f9,0x04f9,0x0425,0x0425,0x0371,0x0371,0x02d9,0x02d9,
  0x0259,0x0259,0x01ed,0x01ed,0x0193,0x0193,0x0149,0x0149,0x010b,0x010b,0x00d5,
  0x00d5,0x00a5,0x00a5,0x007b,0x007b,0x0057,0x0057,0x003b,0x003b,0x0023,0x0023,
  0x0013,0x0013,0x0007,0x0007,0x0001,0x0001,0x5695,0x24ee,0x8000,0x0d30,0x481a,
  0x0481,0x3579,0x017a,0x24ef,0x007b,0x1978,0x0028,0x10ca,0x000d,0x0b5d,0x0034,
  0x078a,0x00a0,0x050f,0x0117,0x0358,0x01ea,0x0234,0x0144,0x0173,0x0234,0x00f5,
  0x0353,0x00a1,0x05c5,0x011a,0x03cf,0x01aa,0x0285,0x0286,0x01ab,0x03d3,0x011a,
  0x05c5,0x00ba,0x08ad,0x007a,0x0ccc,0x01eb,0x1302,0x02e6,0x1b81,0x045e,0x24ef,
  0x0690,0x2865,0x09de,0x3987,0x0dc8,0x2c99,0x10ca,0x3b5f,0x0b5d,0x5695,0x078a,
  0x8000,0x050f,0x24ee,0x0358,0x0d30,0x0234,0x0481,0x0173,0x017a,0x00f5,0x007b,
  0x00a1,0x0028,0x011a,0x000d,0x01aa,0x0034,0x0286,0x00a0,0x03d3,0x0117,0x05c5,
  0x01ea,0x08ad,0x0144,0x0ccc,0x0234,0x1302,0x0353,0x1b81,0x05c5,0x24ef,0x03cf,
  0x2b74,0x0285,0x201d,0x01ab,0x1715,0x011a,0x0fb7,0x00ba,0x0a67,0x01eb,0x06e7,
  0x02e6,0x0496,0x045e,0x030d,0x0690,0x0206,0x09de,0x0155,0x0dc8,0x00e1,0x2b74,
  0x0094,0x201d,0x0188,0x1715,0x0252,0x0fb7,0x0383,0x0a67,0x0547,0x06e7,0x07e2,
  0x0496,0x0bc0,0x030d,0x1178,0x0206,0x19da,0x0155,0x24ef,0x00e1,0x320e,0x0094,
  0x432a,0x0188,0x447d,0x0252,0x5ece,0x0383,0x8000,0x0547,0x481a,0x07e2,0x3579,
  0x0bc0,0x24ef,0x1178,0x1978,0x19da,0x2865,0x24ef,0x3987,0x320e,0x2c99,0x432a,
  0x3b5f,0x447d,0x5695,0x5ece,0x8000,0x8000,0x5695,0x481a,0x481a
];

var ZP_m_table = [
  0x0000,0x0000,0x0000,0x10a5,0x10a5,0x1f28,0x1f28,0x2bd3,0x2bd3,0x36e3,0x36e3,
  0x408c,0x408c,0x48fd,0x48fd,0x505d,0x505d,0x56d0,0x56d0,0x5c71,0x5c71,0x615b,
  0x615b,0x65a5,0x65a5,0x6962,0x6962,0x6ca2,0x6ca2,0x6f74,0x6f74,0x71e6,0x71e6,
  0x7404,0x7404,0x75d6,0x75d6,0x7768,0x7768,0x78c2,0x78c2,0x79ea,0x79ea,0x7ae7,
  0x7ae7,0x7bbe,0x7bbe,0x7c75,0x7c75,0x7d0f,0x7d0f,0x7d91,0x7d91,0x7dfe,0x7dfe,
  0x7e5a,0x7e5a,0x7ea6,0x7ea6,0x7ee6,0x7ee6,0x7f1a,0x7f1a,0x7f45,0x7f45,0x7f6b,
  0x7f6b,0x7f8d,0x7f8d,0x7faa,0x7faa,0x7fc3,0x7fc3,0x7fd7,0x7fd7,0x7fe7,0x7fe7,
  0x7ff2,0x7ff2,0x7ffa,0x7ffa,0x7fff,0x7fff,0xFFFF
];

var ZP_up_table = [
  84,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,
  22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,
  48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,
  74,75,76,77,78,79,80,81,82,81,82,9,86,5,88,89,90,91,92,93,94,95,96,97,82,99,76,
  101,70,103,66,105,106,107,66,109,60,111,56,69,114,65,116,61,118,57,120,53,122,
  49,124,43,72,39,60,33,56,29,52,23,48,23,42,137,38,21,140,15,142,9,144,141,146,
  147,148,149,150,151,152,153,154,155,70,157,66,81,62,75,58,69,54,65,50,167,44,
  65,40,59,34,55,30,175,24,177,178,179,180,181,182,183,184,69,186,59,188,55,190,
  51,192,47,194,41,196,37,198,199,72,201,62,203,58,205,54,207,50,209,46,211,40,
  213,36,215,30,217,26,219,20,71,14,61,14,57,8,53,228,49,230,45,232,39,234,35,
  138,29,24,25,240,19,22,13,16,13,10,7,244,249,10,89,230
];

var ZP_dn_table = [
  145,4,3,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,
  19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,
  45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,
  71,72,73,74,75,76,77,78,79,80,85,226,6,176,143,138,141,112,135,104,133,100,129,
  98,127,72,125,102,123,60,121,110,119,108,117,54,115,48,113,134,59,132,55,130,
  51,128,47,126,41,62,37,66,31,54,25,50,131,46,17,40,15,136,7,32,139,172,9,170,
  85,168,248,166,247,164,197,162,95,160,173,158,165,156,161,60,159,56,71,52,163,
  48,59,42,171,38,169,32,53,26,47,174,193,18,191,222,189,218,187,216,185,214,61,
  212,53,210,49,208,45,206,39,204,195,202,31,200,243,64,239,56,237,52,235,48,233,
  44,231,38,229,34,227,28,225,22,223,16,221,220,63,8,55,224,51,2,47,87,43,246,37,
  244,33,238,27,236,21,16,15,8,241,242,7,10,245,2,1,83,250,2,143,246
];

initFfzTable();
initTables();

