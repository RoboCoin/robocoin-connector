'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        mochacli: {
            all: ['test/**/*Test.js']
        },
        watch: {
            scripts: {
                files: ['apis/**/*.js', 'routes/**/*.js', 'test/**/*Test.js', 'data_mappers/**/*.js', 'lib/**/*.js',
                    'Gruntfile.js'],
                tasks: ['mochacli', 'jshint']
            }
        },
        jshint: {
            src: ['apis/**/*.js', 'routes/**/*.js'],
            options: {
                globals: {
                    require: true,
                    module: true,
                    exports: true,
                    setTimeout: true,
                    console: true,
                    Buffer: true
                },
                globalstrict: true
            }
        }
    });

    grunt.loadNpmTasks('grunt-mocha-cli');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('default', ['mochacli', 'jshint']);
};
