var rjs = require('requirejs');
var zpcoder = rjs('../../zpcoder');
var fs = require('fs');
var assert = require('assert');
function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return view;
}

fs.readFile(__dirname + '/generator/out.bin', function (err, out) {
  if (err) {
  	console.log("can't find binary output, create one with run.sh in generator folder");
  }
  buffer = toArrayBuffer(out);
  var ctx = new zpcoder.ZPNumContext(-1256, 1256);

  var ss = '';
  fs.readFile(__dirname + '/generator/answer.txt', function (err, answer) {
    fs.readFile(__dirname + '/generator/input.txt', function (err, data) {
      var zp = new zpcoder.ZPDecoder({ data: buffer, length: data.length});
      var sp = 0;
        for (var j = 0; j < data.length; ++j) {
          assert.equal(answer[sp++], zp.decodeWithNumContext(ctx));
        }
    });
  });
});
