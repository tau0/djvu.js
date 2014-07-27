var CanvasUtils = function (config) {
  var indent = 512;
  var data = null;
  var width = 0;
  var height = 0;

  var rowSize = function (w) {
    if (!w)
      return Math.floor((width + 31) / 32) * 4;
    else
      return Math.floor((w + 31) / 32) * 4;
  };

  var saveInt = function (offset, number) {
    for (var i = 0; i < 4; ++i) {
      data[offset + i] = 0xff & (number >> (i * 8));
    }
  };

  var makeHeader = function () {
    //magic number
    data[0] = 0x42;
    data[1] = 0x4d;
    saveInt(2, data.length);
    saveInt(10, indent);
    //size of DIB header
    saveInt(14, 40);
    saveInt(18, width);
    saveInt(22, -height);
    //must be 1
    data[26] = 1;
    //number of pixels encoding colors
    data[28] = 1;
    //pixels in meter horizontally
    data[38] = 255;
    //pixels in meter vertically
    data[42] = 255;
    //using all possible colors
    data[46] = 0;
    //color table
    data[54] = 0xff;
    data[55] = 0xff;
    data[56] = 0xff;
    //data[58 .. 60] = 0x00;
  };
  var img = null;
  var w1 = 0;
  var w2 = 0;

  this.put = function (x, y, b) {
    var yIndent = rowSize(w1) * y;
    var i = yIndent + (x >> 3);
    img[i] |= b << (7 - (x & 7));
  };
  var putValid = function (x, y, b) {
    var yIndent = rowSize() * y;
    var i = indent + yIndent + (x >> 3);
    data[i] |= b << (7 - (x & 7));
  };
  var getValid = function (x, y) {
    var yIndent = rowSize(w1) * y;
    var i = yIndent + (x >> 3);
    return img[i] >>  (7 - (x & 7)) & 1;
  };
  var getSquare = function (x, y) {
    var v = getValid(x, y) +
      getValid(x + 1, y) +
      getValid(x, y + 1) +
      getValid(x + 1, y + 1);
    v /= 4;
    return v > 0 ? 1 : 0;

  };
  var downsampling = function() {
    for (var y = 0; y < height; ++y) {
      for (var x = 0; x < width; ++x) {
        putValid(x, y, getSquare(4 * x, 4 * y));
      }
    }
  };

  this.render = function () {
    console.log(width, height);
    downsampling();
    makeHeader();
    var blob = new Blob([ data ], { "type" : "image\/bmp" });
    return URL.createObjectURL(blob);
  };

  this.resize = function (config){
    width = (config.width / 4) | 0;
    height = (config.height / 4) | 0;
    w1 = config.width;
    h1 = config.height;
    data = new Uint8Array(indent + height * rowSize());
    img = new Uint8Array(h1 * rowSize(w1));
  };

  this.clean = function () {
    data = null;
  };
};
