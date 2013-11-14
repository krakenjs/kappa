/*global describe:false, it:false*/
'use strict';

var assert = require('chai').assert,
    Hapi = require('hapi');



describe('kappa', function () {

    var settings, server;

    settings = {
        "paths": [
            "http://stage2p2407.qa.paypal.com:5984/registry/_design/ghost/_rewrite/",
            "https://registry.npmjs.org/"
        ],
        "vhost": "npm.mydomain.com",
        "logLevel": "info"

    };


    it('should register the plugin', function (done) {

        server = new Hapi.Server();
        server.pack.require('../', settings, function (err) {
            assert.ok(!err);
            done();
        });

    });


    it('should return a private package', function (done) {

        server.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/cdb'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.headers['content-type'], 'application/json');
            assert.strictEqual(res.headers['x-registry'], settings.paths[0]);
            assert.strictEqual(res.statusCode, 200);
            done();
        });

    });


    it('should return a 200 for a HEAD request of a private package', function (done) {

        server.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'head',
            url: '/cdb'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.headers['content-type'], 'application/json');
            assert.strictEqual(res.headers['x-registry'], settings.paths[0]);
            assert.strictEqual(res.statusCode, 200);
            done();
        });

    });


    it('should return a public package', function (done) {

        server.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/core-util-is'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.headers['content-type'], 'application/json');
            assert.strictEqual(res.headers['x-registry'], settings.paths[1]);
            assert.strictEqual(res.statusCode, 200);
            done();
        });

    });


    it('should return a 200 for a HEAD request of a public package', function (done) {

        server.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'head',
            url: '/core-util-is'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.headers['content-type'], 'application/json');
            assert.strictEqual(res.headers['x-registry'], settings.paths[1]);
            assert.strictEqual(res.statusCode, 200);
            done();
        });

    });


    it('should return a 404 for an unknown package', function (done) {

        server.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/å'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.headers['x-registry'], settings.paths[1]);
            assert.strictEqual(res.statusCode, 404);
            done();
        });

    });


    it('should return a 404 for a HEAD request of an unknown package', function (done) {

        server.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'head',
            url: '/å'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.headers['x-registry'], settings.paths[1]);
            assert.strictEqual(res.statusCode, 404);
            done();
        });

    });

});