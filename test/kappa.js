/*global describe:false, it:false, before:false, after:false*/
'use strict';

var assert = require('chai').assert,
    url = require('url'),
    nock = require('nock'),
    Hapi = require('hapi');



describe('kappa', function () {

    var expects, settings, server;

    expects = require('./expects');

    settings = {
        paths: expects.map(function (defs) {
            return defs.registry;
        }),
        vhost: 'npm.mydomain.com',
        logLevel: 'error'
    };


    before(function () {

        expects.forEach(function (def) {
            var registry, uri, mock;

            registry = def.registry;
            uri = url.parse(registry);
            mock = nock(uri.protocol + '//' + uri.host);

            Object.keys(def.requests).forEach(function (method) {
                def.requests[method].forEach(function (req) {
                    mock = mock[method](uri.pathname + req.path);
                    mock = mock.reply.apply(mock, req.reply);
                });
            });
        });

    });


    it('should support the `require` api', function (done) {

        server = new Hapi.Server();
        server.pack.require('../', settings, function (err) {
            assert.ok(!err);
            done();
        });

    });


    it('should support the `register` api', function (done) {

        server = new Hapi.Server();
        server.pack.register(require('../'), settings, function (err) {
            assert.ok(!err);
            done();
        });

    });


    it('should return a private package', function (done) {
        var payload;

        server.ext('onPostHandler', function (req, next) {
            var res = req.response;

            if (res.variety === 'plain') {
                res.source.isObject = true;
            }

            next();
        });

        server.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/cdb'
        }, function (res) {
            assert(res);
            assert.ok(/^application\/json/.test(res.headers['content-type']));
            assert.strictEqual(res.headers['x-registry'], settings.paths[0]);
            assert.strictEqual(res.statusCode, 200);

            payload = JSON.parse(res.payload);

            assert.strictEqual(payload.isObject, true);
            assert.strictEqual(payload.versions['0.0.1'].dist.tarball, 'http://npm.mydomain.com/file.tgz');

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
            assert.ok(/^application\/json/.test(res.headers['content-type']));
            assert.strictEqual(res.headers['x-registry'], settings.paths[0]);
            assert.strictEqual(res.statusCode, 200);
            done();
        });

    });

    it('should return content types other than application/json', function (done) {

        server.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/plain'
        }, function (res) {
            assert(res);
            assert.ok(/^text\/plain/.test(res.headers['content-type']));
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
            assert.ok(/^application\/json/.test(res.headers['content-type']));
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
            assert.ok(/^application\/json/.test(res.headers['content-type']));
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


    it('should stop at first registry if server error', function (done) {

        server.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/server-error'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.headers['x-registry'], settings.paths[0]);
            assert.strictEqual(res.statusCode, 500);
            done();
        });

    });

});