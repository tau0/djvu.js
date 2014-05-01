var buster = require('buster');
var rjs = require('requirejs');
var zpcoder = rjs('../../zpcoder');
var fs = require('fs');

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return view;
}

fs.readFile('./generator/out.bin', function (err, out) {
  buffer = toArrayBuffer(out);
  console.log(buffer.length);
  var ctx = new zpcoder.ZPNumContext(-1256, 1256);
  
  var ss = '';
  fs.readFile('./generator/answer.txt', function (err, answer) {
    fs.readFile('./generator/input.txt', function (err, data) {
      var zp = new zpcoder.ZPDecoder({ data: buffer, length: data.length});
      var sp = 0;
      buster.testCase('integration test', {
        'input': function () {
            for (var j = 0; j < data.length; ++j) {
              buster.assert.equals(answer[sp++], zp.decodeWithNumContext(ctx));
            }
        }
      });
    });
  });
});
