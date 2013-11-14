/*global describe:false, before:false, after:false, it:false*/
'use strict';

var path = require('path'),
    kappa = require('../lib/index'),
    assert = require('chai').assert;


describe('Kappa - Package fetching', function () {

    var server;

    before(function (next) {
        process.chdir(path.join(__dirname, 'fixtures'));

        var settings = require('./fixtures/config/settings.json');
        server = kappa.create(settings);
        console.log("running");
        server.start(next);
    });

    after(function (next) {
        server.stop(next);
    });


    it('should return a private package', function (next) {
        server.inject({ url: 'http://localhost/lusca'}, function (res) {
            assert.isObject(res);
            //console.log(res);
            assert.strictEqual(200, res.statusCode);
            next();
        });
    });


     it('should return a 200 for a HEAD request of a private package', function (next) {
     server.inject({ method:'HEAD', url: 'http://localhost/lusca'}, function (res) {
     assert.isObject(res);
     assert.strictEqual(200, res.statusCode);
     next();
     });
     });


    it('should return a public package', function (next) {
        server.inject({ url: 'http://localhost/express'}, function (res) {
            assert.isObject(res);
            assert.strictEqual(200, res.statusCode);
            next();
        });
    });


     it('should return a 200 for a HEAD request of a public package', function (next) {
     server.inject({ method:'HEAD', url: 'http://localhost/express'}, function (res) {
     assert.isObject(res);
     assert.strictEqual(200, res.statusCode);
     next();
     });
     });


    it('should return a 404 for an unknown package', function (next) {
        server.inject({ url: 'http://localhost/å' }, function (res) {
            assert.isObject(res);
            assert.strictEqual(404, res.statusCode);
            next();
        });
    });

    it('should return a 404 for a HEAD request of an unknown package', function (next) {
        server.inject({ method: 'HEAD', url: 'http://localhost/å' }, function (res) {
            assert.isObject(res);
            assert.strictEqual(404, res.statusCode);
            next();
        });
    });

//    it('should pass all npm tests', function (next) {
//        process.chdir('./node_modules/npm/');
//        npm.commands.test([], next);
//    });

});


/**
 * Tests for port startup options.
 * 1. Default
 * 2. By config file
 * 3. By env var
 */
describe('Kappa - port startup options', function () {

    var server,
        settings = require('./fixtures/config/settings.json');

    process.chdir(path.join(__dirname, 'fixtures'));

    before(function (next) {
        server = kappa.create(settings);
        server.start(next);
    });


    it('should be running on the default port if nothing specified by the settings, and no envvar', function (next) {
        assert.strictEqual(8000, server.info.port);
        server.stop(next);
    });

    it('should be running on port specified by the settings', function (next) {
        settings.port = 8001;
        server = kappa.create(settings);
        server.start(function () {
            assert.strictEqual(settings.port, server.info.port);
            server.stop(next)
        });
    });

    it('should be running on port specified by the environment, overriding the settings file',function(next){
        process.env['KAPPA_PORT'] = 8002;
        server = kappa.create(settings);
        server.start(function () {
            assert.strictEqual(8002, server.info.port);
            server.stop(next)
        });
    })

});