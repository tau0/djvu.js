define(['./lib', './zpcoder'], function (lib, zpcoder) {

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
      clearArray(this.nodes);
      clearArray(left);
      clearArray(right);
      init();
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
    this.ptr = 0;

    this.decodeWithoutContext = function () {
      var dummy = 0;
      return this.decodeSub(dummy, 0x8000 + (a >> 1));
    };

    this.decodeWithBit = function (context) {
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
      if(bytesLeft === 0 || this.ptr + 1 === this.data.length) {
        throw {};
      }
      char = this.data[this.ptr++];
      --bytesLeft;
      return char;
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
          assert(delay);
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

        decision = low >= cutoff || (high >= cutoff && this.decodeWithBit(context.nodes[currentNode]));
        currentNode = decision ? context.getRight(currentNode) : context.getLeft (currentNode);

        console.log("FR ", phase, range, decision, cutoff);
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
        a = (a << shift) % 65536;
        code = ((code << shift) | ((buffer >> scount) & ((1 << shift) - 1))) % 65536;
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
        a = (z << 1) % 65536;
        code = ((code << 1) | ((buffer >> scount) & 1)) % 65536;
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
    var bytesLeft = this.data.length;

    function ffz(value) {
      return value >= 0xff00 ? ZP_FFZ_table[value & 0xff] + 8 : ZP_FFZ_table[(value >> 8) & 0xff];
    }

    this.open();
  };

  // Errors
  // =============================================================================================

  var error = {
    incorrectInput: 'Incorrect input',
    assertError: 'Assert error'
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
  */

});
