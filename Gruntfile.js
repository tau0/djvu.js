module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      debug: {
        banner:
            "/* global\n" +
            "document: false, DEBUG: false,\n" +
            "console: false, XMLHttpRequest: false,\n" +
            "Uint8ClampedArray: false, Uint32Array: false,\n" +
            "ArrayBuffer: false, Uint8Array: false,\n" +
            "*/\n" +
            '"use strict";\n',
        src: 'src/base/**/*.js',
        dest: 'build/base.js'
      },
      production: {
        banner:
            "/* global\n" +
            "document: false, DEBUG: false,\n" +
            "console: false, XMLHttpRequest: false,\n" +
            "Uint8ClampedArray: false, Uint32Array: false,\n" +
            "ArrayBuffer: false, Uint8Array: false,\n" +
            "*/\n" +
            '"use strict";\n',
        src: 'src/base/**/*.js',
        dest: '../djvu/djvu.js'
      }
    },
    jshint: {
      beforeconcat: ['src/**/*.js'],
      afterconcat: ['build/*.js'],
      options: {
        '-W097': false
      }
    },
    shell: {
      runsh: {
        command: "./test/run.sh"
      }
    },
    mochaTest: {
      test: {
        src: ['test/**/*.js'],
        options: {
          run: true,
        },
      },
    }
  });


   grunt.loadNpmTasks('grunt-contrib-jshint');
   grunt.loadNpmTasks('grunt-contrib-concat');
   grunt.loadNpmTasks('grunt-mocha-test');
   grunt.loadNpmTasks('grunt-shell');

  // Default task(s).
  grunt.registerTask('default', ['concat:debug', 'jshint', 'shell', 'mochaTest']);
  grunt.registerTask('prod', ['concat:production']);

};
