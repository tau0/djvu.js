var CanvasUtils = function (config) {
  var indent = 512;
  var data = null;
  var width = 0;
  var height = 0;

  var rowSize = function () {
    return Math.floor((width + 31) / 32) * 4;
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

  this.put = function (x, y) {
    if (x < 0 || y < 0) {
      throw "you know what to do";
    }
    var yIndent = rowSize() * y;
    var i = indent + yIndent + Math.floor(x / 8);
    data[i] |= 1 << (7 - x % 8);
  };

  this.render = function () {
    makeHeader();
    var blob = new Blob([ data ], { "type" : "image\/bmp" });
    return URL.createObjectURL(blob);
  };

  this.resize = function (config){
    width = config.width;
    height = config.height;
    data = new Uint8Array(indent + height * rowSize());
  };

  this.clean = function () {
    data = null;
  };
};
