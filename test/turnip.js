/*global describe:false, before:false, after:false, it:false*/
'use strict';

var path = require('path'),
    kappa = require('../lib/index'),
    assert = require('chai').assert;



describe('kappa', function () {

    var server;

    before(function (next) {
        process.chdir(path.join(__dirname, 'fixtures'));

        var settings = require('./fixtures/config/settings.json');
        server = kappa.create(settings);
        server.start(next);
    });

    after(function (next) {
        server.stop(next);
    });


    it('should return a private package', function (next) {
        server.inject({ url: 'http://localhost/cdb'}, function (res) {
            assert.isObject(res);
            assert.strictEqual(200, res.statusCode);
            next();
        });
    });


    it('should return a 200 for a HEAD request of a private package', function (next) {
        server.inject({ method:'HEAD', url: 'http://localhost/cdb'}, function (res) {
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