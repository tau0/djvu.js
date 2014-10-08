
// ================================ Fetcher ======================================================
//
//
//
var Fetcher = function (config, callback) {
  this.downloadPage = function (pageNumber, callback) {

    var left = parseInt(this.manifest[pageNumber].offset);
    var size = parseInt(this.manifest[pageNumber].size);
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

  var filePreload = new XMLHttpRequest();
  filePreload.open("GET", config.manifestUrl, true);
  filePreload.responseType = "json";
  filePreload.onload = function () {
    this.manifest = this.processManifest(filePreload.response);
    if (callback) {
      callback();
    }
    console.log(filePreload.response);
  }.bind(this);
  filePreload.send();
};

// ============================= Renderer ========================================================
//
//
//
var Renderer = function (config, page) {
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
      current = current.parent;
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
    return { width: width, height: height };
  };

  this.render = function (page) {
    if (!page) {
      throw "Page not specified";
    }
    this.fetcher.downloadPage(page.pageNumber, function (binaryData) {
      this.pointer = 0;
      this.data = binaryData;
      var jb2chunk = this.locateJB2Chunk();
      var response = this.loadJB2(page.target);
      if (page.callback) {
        page.callback(response);
      }
    }.bind(this));
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

  this.fetcher = new Fetcher(config, function() {
    if (page) {
      this.render(page);
    }
  }.bind(this));
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
