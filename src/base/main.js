
// ================================ Fetcher ======================================================
//
//
//
var Fetcher = function (config, manifest) {
  this.downloadPage = function (pageNumber, callback) {
    lib.log('loading page: ' + pageNumber + 'from' + this.manifest.files.length);

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

  this.manifest = manifest;
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

  this.loadJB2 = function (chunkInfo) {
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

    lib.log("first record valid, image h; " + height + ", width: " + width);
    this.canvas.resize({ width: width, height: height });

    var libCount = 0;
    var q = 0; //TODO rm me
    var symbol = new Symbol({ jb2 : jb2 });
    var position;
    var index;

    while(true) {
      record = jb2.decodeRecordType();
      switch(record) {
        case this.records.jb2_new_symbol_add_to_image_and_library:
          lib.log("jb2_new_symbol_add_to_image_and_library");
          symbol = new Symbol({ jb2 : jb2 });
          symbol.decodeDirectSymbol();
          position = jb2.decodeSymbolPosition({
            width : symbol.getWidth(),
            height : symbol.getHeight()
          });
          lib.log("symbol: " + q++);
          symbol.draw({
            canvas: this.canvas,
            position: position
          });
          symbol.crop();
          jb2.library.addSymbol(symbol);
        break;
        case this.records.jb2_matched_symbol_with_refinement_add_to_image_and_library:
          lib.log("jb2_matched_symbol_with_refinement_add_to_image_and_library");
          jb2.matchingSymbolIndex.setInterval(0, jb2.library.getSize() - 1);
          index = zp.decodeWithNumContext(jb2.matchingSymbolIndex);
          lib.log("INDEX: ", index);

          symbol = new Symbol({ jb2 : jb2 });
          symbol.decodeRefinedSymbol(jb2.library.getByIndex(index));
          position = jb2.decodeSymbolPosition({
            width : symbol.getWidth(),
            height : symbol.getHeight()
          });
          lib.log("symbol: " + q++);
          symbol.draw({
            canvas: this.canvas,
            position: position
          });
          symbol.crop();
          jb2.library.addSymbol(symbol);
        break;
        case this.records.jb2_matched_symbol_copy_to_image_without_refinement:
          lib.log("jb2_matched_symbol_copy_to_image_without_refinement");
          jb2.matchingSymbolIndex.setInterval(0, jb2.library.getSize() - 1);
          index = zp.decodeWithNumContext(jb2.matchingSymbolIndex);
          symbol = jb2.library.getByIndex(index);
          position = jb2.decodeSymbolPosition({
            width: symbol.getWidth(),
            height: symbol.getHeight()
          });
          symbol.draw({
            canvas: this.canvas,
            position: position
          });
          lib.log(position);
        break;
        default:
          this.canvas.render();
          throw "Record not defined here: " + record;
      }
    }
  };

  this.render = function (target, pageNumber) {
    lib.log(this.fetcher);
    this.fetcher.downloadPage(pageNumber, function (binaryData) {
      this.pointer = 0;
      this.data = binaryData;
      var jb2chunk = this.locateJB2Chunk();
      lib.log(jb2chunk.length);
      return this.loadJB2(jb2chunk);
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
