var js = document.createElement('script');
js.type = 'text/javascript';
js.src = 'http://code.jquery.com/jquery-2.1.0.min.js';
document.body.appendChild(js);

var DEBUG = true;
var logger = logger || {};
logger.log = function () {
  if (DEBUG) {
    console.log.apply(console, arguments);
  }
};

var config = {
  url: 'http://178.63.105.73/test/aHR0cDovL2xpYmdlbi5vcmcvZ2V0P25hbWV0eXBlPW9yaWcmbWQ1PTAwMDAwOWRhNThkMmIwMzUxOTM0OTZhOTg2MTU2MWM0',
};

var Fetcher = function (config, callback) {
  this.downloadPage = function (pageNumber, callback) {
    logger.log('loading page: ' + pageNumber + 'from' + this.manifest.files.length);

    var offset = this.manifest.files[pageNumber].offset;
    var size = this.manifest.files[pageNumber].size;

    var filePreload = new XMLHttpRequest();
    filePreload.open("GET", config.url, true);
    filePreload.setRequestHeader("Range", "bytes=" + offset + "-" + offset + size);
    filePreload.responseType = "arraybuffer";
    filePreload.onload = function () {
      var arrayBuffer = filePreload.response;
      var byteArray = arrayBuffer.byteLength ? new Uint8Array(arrayBuffer) : arrayBuffer;
      callback();
    };
    filePreload.send();
  };

  $.getJSON(config.url + '.json', function(data) {
    this.manifest = data;
    logger.log('there are ' + data.files.length + ' pages');
    callback();
  }.bind(this));
};

var Renderer = function (config, callback) {
  this.locateJB2Chunk = function () {};
  this.render = function (target, pageNumber) {
    logger.log(this.fetcher);
    this.fetcher.downloadPage(pageNumber, function () {
      logger.log('page downloaded');
    });
  };
  this.fetcher = new Fetcher(config, function () {
    callback();
  });
};

function main(page) {
  logger.log('worker started');
  var renderer = new Renderer(config, function () {
    renderer.render('test', 1);
    logger.log('render is ready');
  });
}

document.ready = main;
