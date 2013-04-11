/*global describe:false, before:false*/
'use strict';

var Hapi = require('hapi'),
    npm = require('npm'),
    assert = require('assert');


describe('turnip', function () {

    var server;

    before(function (next) {
        var config = {
            paths: ['http://10.9.110.82:5984/registry/_design/app/_rewrite/', 'http://registry.npmjs.org/']
        };

        server = new Hapi.Server(1234);
        server.plugin.require('../', config, function () {
            server.start();
            next();
        });
    });

    before(function (next) {
        npm.load({ registry: 'http://localhost:1234' }, function (err) {
            assert.ok(!err, 'Could not initialize npm');
            next();
        });
    });


    it('should pass all npm tests', function (next) {
        process.chdir('./node_modules/npm/');
        npm.commands.test([], next);
    });

});