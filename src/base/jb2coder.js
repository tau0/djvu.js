var JB2Decoder = function () {
  this.imageSize = new ZPNumContext(0, 10);
  this.matchingSymbolIndex = new ZPNumContext(0, 0);
  this.symbolColumnNumver = new ZPNumContext(0, 0);
  this.symbolRowNumber = new ZPNumContext(0, 0);
  this.sameLineColumnOffset = new ZPNumContext(0, 0);
  this.sameLineRowOffset = new ZPNumContext(0, 0);
  this.newLineColumnOffset = new ZPNumContext(0, 0);
  this.newLineRowOffset = new ZPNumContext(0, 0);
  this.commentLength = new ZPNumContext(0, 0);
  this.commentOctet = new ZPNumContext(0, 0);
  this.requiredDictionaySize = new ZPNumContext(0, 0);
  this.recordType = new ZPNumContext(0, 0);
  this.first = new JB2Rect(-1, 0, 0, 1);
  this.lineCounter = 0;

  this.reset = function () {
    this.recordType.reset();
    this.imageSize.reset();
    this.matchingSymbolIndex.reset();
    this.symbolColumnNumver.reset();
    this.symbolRowNumber.reset();
    this.sameLineRowOffset.reset();
    this.sameLineColumnOffset.reset();
    this.newLineRowOffset.reset();
    this.newLineColumnOffset.reset();
    this.commentOctet.reset();
    this.commentLength.reset();
    this.requiredDictionaySize.reset();
  };
};

var JB2Rect = function (left, top, width, height) {
  this.left = left;
  this.top = top;
  this.width = top;
  this.height = height;
};

