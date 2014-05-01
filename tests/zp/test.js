var fs = require('fs');
eval(fs.readFileSync('../../main.js') + '');

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return view;
}

fs.readFile('./generator/out.txt', function (err,data) {
  buffer = toArrayBuffer(data);
  ans = "";
  for (var i in buffer)
    ans += String.fromCharCode(data[i]);
  var ctx = new ZPNumContext(-1256, 1256);
  var zp = new ZPDecoder({ data: buffer});
  var ss = '';
  for (var j = 0; j < 752; ++j) {
    ss += String.fromCharCode(zp.decodeWithNumContext(ctx));
  }
  console.log(ss);
});
