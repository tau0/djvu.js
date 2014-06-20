var JB2Decoder = function (config) {
  this.imageSize = new ZPNumContext(0, 262142);
  this.recordType = new ZPNumContext(0, 11);
  this.eventualImageRefinement = { value: 0 };

  this.reset = function () {
  };

  this.data = config.data || null;
  this.getc = config.getter || undefined;
  this.ptr = config.ptr || null;

  this.zp = new ZPDecoder(config);
  this.decodeRecordType = function () {
    return this.zp.decodeWithNumContext(this.recordType);
  };
};

var JB2Rect = function (left, top, width, height) {
  this.left = left;
  this.top = top;
  this.width = top;
  this.height = height;
};

