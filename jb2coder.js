define(['./zpcoder', './lib', './error'], function (zpcoder, lib, error) {
  var JB2Decoder = function () {
    this.imageSize = new zpcoder.ZPNumContext(0, 10);
    this.matchingSymbolIndex = new zpcoder.ZPNumContext(0, 0);
    this.symbolColumnNumver = new zpcoder.ZPNumContext(0, 0);
    this.symbolRowNumber = new zpcoder.ZPNumContext(0, 0);
    this.sameLineColumnOffset = new zpcoder.ZPNumContext(0, 0); 
    this.sameLineRowOffset = new zpcoder.ZPNumContext(0, 0);
    this.newLineColumnOffset = new zpcoder.ZPNumContext(0, 0);
    this.newLineRowOffset = new zpcoder.ZPNumContext(0, 0); 
    this.commentLength = new zpcoder.ZPNumContext(0, 0);
    this.commentOctet = new zpcoder.ZPNumContext(0, 0); 
    this.requiredDictionaySize = new zpcoder.ZPNumContext(0, 0);
    this.recordType = new zpcoder.ZPNumContext(0, 0); 
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

  return {
    JB2Decoder: JB2Decoder,
    JB2Rect: JB2Rect
  };
});
