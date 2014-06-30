var fs = require('fs');
var vm = require('vm');

var includeInThisContext = function(path) {
      var code = fs.readFileSync(path);
          vm.runInThisContext(code, path);
}.bind(this);

includeInThisContext(__dirname + "/../../../../build/base.js");
var assert = require('assert');
function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return view;
}

it('ZPDecoder with bit swapping', function(done) {
  fs.readFile(__dirname + '/answer.txt', function (err, answer) {
    fs.readFile(__dirname + '/out.bin', function (err, out) {
      if (err) {
        console.log("can't find binary output, create one with run.sh in generator folder");
      }
      buffer = toArrayBuffer(out);
      var ctxs = [];
      for (var i = 0; i < 10; ++i) {
        ctxs[i] = { value: 0 };
      }

      var ss = '';
      fs.readFile(__dirname + '/input.txt', function (err, data) {
        var zp = new ZPDecoder({ data: buffer, length: out.length});
        var sp = 0;
        var qq = 0;
        for (var j = 0; j < data.length; ++j) {
          for (var q = 0; q < 8; ++q) {
            assert.equal((answer[sp] >> q) & 1, zp.decodeWithBitContext(ctxs[qq++ % 10]));
          }
          sp++;
        }
        done();
      });
    });
  });
});
