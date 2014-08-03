(function (module) {
    'use strict';

    module.exports = function (grunt) {
        // These variable would be passed in from the master build file.
        var target = grunt.option('target') || 'staging',
            version = grunt.option('product_version') || 'version_not_set';

        // config
        grunt.initConfig({
            pkg: grunt.file.readJSON('bower.json'),

            // Configuration Paths
            rootfolder: './',
            distfolder: '<%= rootfolder %>/dist/',
            srcfolder: '<%= rootfolder %>/src/',
            demofolder: '<%= rootfolder %>/demo/',
            vendorfolder: '<%= rootfolder %>/bower_components/',
            testsfolder: '<%= rootfolder %>/tests/',
            dist: {
                root: '<%= distfolder %>',
            },

            // Style Checks
            jshint: {
                files: ['<%= srcfolder %>**/*.js', '!<%= srcfolder %>**/*.postfix.js', '!<%= srcfolder %>**/*.prefix.js', '<%= testsfolder %>**/*.spec.js'],
                options: {
                    jshintrc: '.jshintrc'
                }
            },

            // Code Cleanup for JS & HTML
            jsbeautifier: {
                files: ["<%= srcfolder %>**/*.js", '<%= testfolder %>**/*.spec.js', '<%= srcfolder %>**/*.html', '<%= srcfolder %>index.html'],
                options: {
                    html: {
                        braceStyle: "collapse",
                        indentChar: " ",
                        indentScripts: "keep",
                        indentSize: 2,
                        maxPreserveNewlines: 10,
                        preserveNewlines: true,
                        unformatted: ["a", "sub", "sup", "b", "i", "u"],
                        wrapLineLength: 0
                    },
                    js: {
                        braceStyle: "collapse",
                        breakChainedMethods: false,
                        e4x: false,
                        evalCode: false,
                        indentChar: " ",
                        indentLevel: 0,
                        indentSize: 4,
                        indentWithTabs: false,
                        jslintHappy: true,
                        keepArrayIndentation: false,
                        keepFunctionIndentation: false,
                        maxPreserveNewlines: 10,
                        preserveNewlines: true,
                        spaceBeforeConditional: true,
                        spaceInParen: false,
                        unescapeStrings: false,
                        wrapLineLength: 0
                    }
                }
            },

            // Unit Testing
            karma: {
                unit: {
                    configFile: 'tests/karma.conf.unit.js'
                },
                debug: {
                    configFile: 'tests/karma.conf.unit.debug.js'
                },
                release: {
                    configFile: 'tests/karma.conf.unit.release.js'
                }
            },

            // HTTP(S) development server
            connect: {
                devserver: {
                    options: {
                        hostname: '*',
                        port: 8020,
                        protocol: 'http',
                        useAvailablePort: true,
                        base: '',
                        open: true,
                        keepalive: true // setting this to true means this task is blocking
                    }
                }
            },

            clean: {
                dist: {
                    files: [{
                        dot: true,
                        src: [
                            '.tmp',
                            '<%= dist.root %>/**/*.*'
                        ]
                    }],
                    options: {
                        force: true
                    }
                }
            },

            copy: {
            },

            uglify: {
                options: {
                    sourceMap: false,
                    sourceMapIncludeSources: true,
                    preserveComments: false,
                    compress: {
                        drop_console: true,
                        global_defs: {
                            "DEBUG": false
                        },
                        dead_code: true
                    },
                    banner: '/*\n * <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        ' * <%= pkg.homepage %>\n' +
                        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;*/\n'
                },
                dist: {
                    files: {
                        'dist/angular-http-batch.min.js': ['dist/angular-http-batch.js']
                    }
                }
            },

            concat: {
                options: {
                    banner: '/*\n * <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        ' * <%= pkg.homepage %>\n' +
                        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>\n */\n'
                },
                dist: {
                    src: ['src/angular-http-batch.prefix.js',
                          'src/angular-http-batch.js',
                          'src/providers/httpBatchConfig.js',
                          'src/services/httpBatcher.js',
                          'src/config/httpBackendDecorator.js',
                          'src/angular-http-batch.postfix.js'],
                    dest: 'dist/angular-http-batch.js'
                }
            },

            plato: {
                analysis: {
                    options : {
                        title: 'Angular Http Batch Complexity Report',
                        jshint : grunt.file.readJSON('.jshintrc')
                    },
                    files: {
                        'tests/reports/complexity': ['src/**/*.js', '!src/**/*.postfix.js', '!src/**/*.prefix.js']
                    }
                }
            }

        });

        grunt.loadNpmTasks('grunt-contrib-jshint');
        grunt.loadNpmTasks('grunt-jsbeautifier');
        grunt.loadNpmTasks('grunt-karma');
        grunt.loadNpmTasks('grunt-contrib-connect');
        grunt.loadNpmTasks('grunt-contrib-clean');
        grunt.loadNpmTasks('grunt-contrib-copy');
        grunt.loadNpmTasks('grunt-contrib-concat');
        grunt.loadNpmTasks('grunt-contrib-uglify');
        grunt.loadNpmTasks('grunt-plato');

        // Create Custom Tasks
        grunt.registerTask('default', [
            'jsbeautifier',
            'jshint',
            'karma:unit',
            'plato:analysis',

            'concat:dist',
            'uglify:dist'
        ]);
    };
}(module));