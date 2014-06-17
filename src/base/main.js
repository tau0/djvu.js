
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
    return Sjbz.length;
  };

  this.loadJB2 = function () {};

  this.render = function (target, pageNumber) {
    lib.log(this.fetcher);
    this.fetcher.downloadPage(pageNumber, function (binaryData) {
      this.pointer = 0;
      this.data = binaryData;
      var length = this.locateJB2Chunk();
      lib.log(length);
      return this.loadJB2(length);
    }.bind(this));
  };

  this.fetcher = new Fetcher(config, manifest);
};
// Library
// ============================================================================================
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
