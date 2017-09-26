var shared = function (config) {
    'use strict';
    config.set({

        // base path, that will be used to resolve files and exclude
        basePath: '../',


        // frameworks to use
        frameworks: ['chai', 'mocha', 'sinon'],


        preprocessors: {
            'src/**/*.js': ['coverage']
        },


        // list of files to exclude
        exclude: [
        ],


        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
        reporters: ['progress', 'coverage'],


        coverageReporter: {
            type: 'html',
            dir: 'tests/reports/coverage/'
        },

        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,


        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        //browsers: ['PhantomJS', 'Chrome', 'Safari', 'Firefox'],
        browsers: ['PhantomJS'],


        // If browser does not capture in given timeout [ms], kill it
        captureTimeout: 60000,


        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: true
    });
};

shared.files = [
    // 3rd party libraries
    'bower_components/angular/angular.js',

    // app libraries
    'src/angular-http-batch.js',
    'src/providers/httpBatchConfig.js',
    'src/services/httpBatcher.js',
    'src/services/adapters/*.js',
    'src/config/httpBackendDecorator.js',
    './node_modules/phantomjs-polyfill/bind-polyfill.js'
];

module.exports = shared;