var CanvasUtils = function (config) {
  if (config && config.id) {
    this.canvas = document.getElementById(config.id);
    this.ctx = this.canvas.getContext('2d');
    this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.buffer = new ArrayBuffer(this.imageData.data.length);
    this.pixels = new Uint32Array(this.buffer);
    this.buffer8 = new Uint8ClampedArray(this.buffer);
  }

  this.put = function (x, y) {
    this.pixels[y * this.canvas.width + x] =
      (255 << 24) |
      (0x00 << 16) |
      (0x00 << 8) |
      0x00;
  };
  this.render = function () {
    this.imageData.data.set(this.buffer8);
    this.ctx.putImageData(this.imageData, 0, 0);
  };
  this.resize = function (config){
    this.canvas.width = config.width;
    this.canvas.height = config.height;
    this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.buffer = new ArrayBuffer(this.imageData.data.length);
    this.pixels = new Uint32Array(this.buffer);
    this.buffer8 = new Uint8ClampedArray(this.buffer);
  };
};
