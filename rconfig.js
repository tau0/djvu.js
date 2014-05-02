require.config({
  baseUrl: './',
  paths: {
    jquery: './bower_components/jquery/dist/jquery.min'
  }
});

var DEBUG = true; 
var config = {
  url: 'http://178.63.105.73/test/aHR0cDovL2xpYmdlbi5vcmcvZ2V0P25hbWV0eXBlPW9yaWcmbWQ1PTAwMDAwOWRhNThkMmIwMzUxOTM0OTZhOTg2MTU2MWM0',
};

require(['main', 'jquery'], function (DJVUJS, $) {
  console.log('starting', DJVUJS);

  $.getJSON(config.url + '.json', function(manifest) {
    var renderer = new DJVUJS.Renderer(config, manifest);
    renderer.render('target', 0);
  });

});
