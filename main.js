var js = document.createElement('script');
js.type = 'text/javascript';
js.src = 'http://code.jquery.com/jquery-2.1.0.min.js';
document.body.appendChild(js);

var DEBUG = true;
var logger = logger || {};
logger.log = function () {
  if (DEBUG) {
    console.log.apply(console, arguments);
  }
};

var config = {
  url: 'http://178.63.105.73/test/aHR0cDovL2xpYmdlbi5vcmcvZ2V0P25hbWV0eXBlPW9yaWcmbWQ1PTAwMDAwOWRhNThkMmIwMzUxOTM0OTZhOTg2MTU2MWM0',
};

// Constants region:
// // ============================
var CHUNK_ID_FORM = 0x464F524D;
var CHUNK_ID_Sjbz = 0x536A627A;
var ID_DJVU = 0x444A5655;
// ==============================
var Fetcher = function (config, callback) {
  this.downloadPage = function (pageNumber, callback) {
    logger.log('loading page: ' + pageNumber + 'from' + this.manifest.files.length);

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

  $.getJSON(config.url + '.json', function(data) {
    this.manifest = data;
    logger.log('there are ' + data.files.length + ' pages');
    callback();
  }.bind(this));
};

var ZPCoder = function (input) {
  this.data = input.data || null;
};


var Renderer = function (config, callback) {
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
    logger.log(this.fetcher);
    this.fetcher.downloadPage(pageNumber, function (binaryData) {
      this.pointer = 0;
      this.data = binaryData;
      var length = this.locateJB2Chunk();
      logger.log(length);
      return this.loadJB2(length);
    }.bind(this));
  };
  this.fetcher = new Fetcher(config, function () {
    callback();
  });
};

function main(page) {
  logger.log('worker started');
  var renderer = new Renderer(config, function () {
    renderer.render('test', 0);
    logger.log('render is ready');
  });
}

document.ready = main;
