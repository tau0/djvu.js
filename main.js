'use strict';
// ================================ Fetcher ======================================================
//
//
//
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

// ============================= Renderer ========================================================
//
//
//
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
    clearArray(nodes);
    clearArray(left);
    clearArray(right);
    init();
  };

  var nodes = [];
  var n;
  var allocated;
  var left = [];
  var right = [];

  var newNode = function () {
    nodes[n] = 0;
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

    result = newNode();
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

    result = newNode();
    right[i] = result;
    return result;
  };

  var init = function () {
    n = 1;
    nodes[0] = 0;
    left[0] = right[0] = 0;
  };

  if (amin > amax) {
    throw error.incorrectInput;
  }

  this.min = amin;
  this.max = amax;
  init();
};
// ============================= ZPCoder =======================================================
//
//
//


var ZPDecoder = function (input) {
  // public:
  this.data = input.data || null;

  this.decodeWithoutContext = function () {
    var dummy = 0;
    return decodeSub(dummy, 0x8000 + (a >> 1));
  };

  this.decodeWithBit = function (context) {
    var z = a + ZP_p_table[context];
    if (z <= fence) {
      a = z;
      return context & 1;
    }
    var d = 0x6000 + ((z + a) >> 2);
    if (z > d) {
      z = d;
    }
    return decodeSub(context, z);
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
      decision = low >= cutoff || (high >= cutoff && this.decodeWithBit(context.nodes[currentNode]));

      currentNode = decision ? context.getRight(currentNode) : context.getLeft (currentNode);

      switch (phase) {
        case 1:
          negative = !decision;
          if (negative) {
              var temp = - low - 1;
              low = - high - 1;
              high = temp;
          }
          phase = 2; cutoff = 1;
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
    return negative ? -cutoff-1 : cutoff;
  };

  this.ptr = 0;

  // private:
  var a;
  var code;
  var fence;
  var buffer;
  var byte;
  var scount;
  var delay;
  var bytesLeft;

  function nextByte(char) {
    if(bytesLeft === 0 || this.ptr + 1 === this.data.length) {
      return false;
    }
    char = this.data[this.ptr++];
    --bytesLeft;
    return true;
  }

  function open() {
    if (!nextByte(byte)) {
      byte = 0xff;
    }
    code = byte << 8;
    if (!nextByte(byte)) {
      byte = 0xff;
    }
    code = code | byte;
    delay = 25;
    scount = 0;
    preload();

    fence = code;
    if (code >= 0x8000) {
      fence = 0x7fff;
    }
  }

  function preload() {
    while (scount <= 24) {
      if (!nextByte(byte)) {
        byte = 0xff;
        delay--;
        assert(delay);
      }
      buffer = (buffer << 8) | byte;
      scount += 8;
    }
  }

  function ffz(value) {
    return value >= 0xff00 ? ZP_FFZ_table[value & 0xff] + 8 : ZP_FFZ_table[(value >> 8) & 0xff];
  }

  function decodeSub(context, z) {
    var bit = context & 1;

    if (z > code)
    {
      z = 0x10000 - z;
      a += z;
      code = code + z;

      context = ZP_dn_table[context];

      var shift = ffz(a);
      scount -= shift;
      a = (a << shift);
      code = (code << shift) | ((buffer >> scount) & ((1 << shift) - 1));
      if (scount < 16) {
        preload();
      }

      fence = code;
      if (code >= 0x8000) {
        fence = 0x7fff;
      }
      return bit ^ 1;
    } else {
      if (a >= ZP_m_table[context])
        context = ZP_up_table[context];

      scount -= 1;
      a = z << 1;
      code = (code << 1) | ((buffer >> scount) & 1);
      if (scount < 16) {
        preload();
      }

      fence = code;
      if (code >= 0x8000) {
        fence = 0x7fff;
      }
      return bit;
    }
  }
};

// Errors
// =============================================================================================

var error = {
  incorrectInput: 'Incorrect input',
  assertError: 'Assert error'
};

// Library
// ============================================================================================
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

function clearArray(array) {
  while (array.length > 0) {
      array.shift();
  }
}

function assert(value) {
  if (!value) {
    throw error.assertError;
  }
}
// Constants region:
// // ============================================================================================

var CHUNK_ID_FORM = 0x464F524D;
var CHUNK_ID_Sjbz = 0x536A627A;
var ID_DJVU = 0x444A5655;

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
// ==============================================================================================

// ========================================== main ==========================================
//
//
//
//
function main(page) {
  logger.log('worker started');
  var renderer = new Renderer(config, function () {
    renderer.render('test', 0);
    logger.log('render is ready');
  });
}

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

document.ready = main;
