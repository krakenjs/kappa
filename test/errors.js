/*global describe:false, it:false, before:false, after:false, afterEach:false*/
'use strict';

var http = require('http'),
    Hapi = require('hapi'),
    assert = require('chai').assert;

describe('fallbacks', function () {
    this.timeout(10000);

    var settings, kappa, registryA, registryB, registryC;

    settings = {
        paths: ['http://localhost:1234', 'http://localhost:1235', 'http://localhost:1236'],
        vhost: 'npm.mydomain.com',
        logLevel: 'error'
    };


    before(function (done) {
        kappa = new Hapi.Server();
        kappa.pack.require('../', settings, function (err) {
            assert.ok(!err);

            registryA = http.createServer();
            registryA.on('request', function (req, res) {
                res.statusCode = 404;
                res.end('not found');
            });

            registryA.listen(1234, function () {

                // Start the fallback registry
                registryC = http.createServer(function (req, res) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end('{}');
                }).listen(1236, done);

            });

        });
    });


    after(function (done) {
        registryA.close(function () {
            registryB.close(function () {
                registryC.close(done);
            });
        });
    });


    afterEach(function (done) {
        if (registryB) {
            registryB.removeAllListeners('request');
            done();
        } else {
            registryB = http.createServer();
            registryB.on('listening', done);
            registryB.listen(1235);
        }
    });


    it('should fallback when server not found', function (done) {
        kappa.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/core-util-is'
        }, function (res) {
            assert(res);
            assert.ok(/^application\/json/.test(res.headers['content-type']));
            assert.strictEqual(res.headers['x-registry'], settings.paths[2]);
            assert.strictEqual(res.statusCode, 200);
            done();
        });
    });


    it('should fallback when server times out', function (done) {
        registryB.on('request', function (req, res) {
            setTimeout(function () {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end('{}');
            }, 6000);
        });

        kappa.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/core-util-is'
        }, function (res) {
            assert(res);
            assert.ok(/^application\/json/.test(res.headers['content-type']));
            assert.strictEqual(res.headers['x-registry'], settings.paths[2]);
            assert.strictEqual(res.statusCode, 200);
            done();
        });
    });


    it('should fallback on read operation errors', function (done) {
        registryB.on('request', function (req, res) {
            res.statusCode = 500;
            res.end('error');
        });

        kappa.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/core-util-is'
        }, function (res) {
            assert(res);
            assert.ok(/^application\/json/.test(res.headers['content-type']));
            assert.strictEqual(res.headers['x-registry'], settings.paths[2]);
            assert.strictEqual(res.statusCode, 200);
            done();
        });
    });


    it('should fail if the primary registry times out', function (done) {
        registryA.removeAllListeners('request');
        registryA.on('request', function (req, res) {
            setTimeout(function () {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end('{}');
            }, 6000);
        });

        kappa.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/core-util-is'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.statusCode, 500);
            done();
        });
    });


    it('should fail on first registry error for some read operation', function (done) {
        registryA.removeAllListeners('request');
        registryA.on('request', function (req, res) {
            res.statusCode = 500;
            res.end('error');
        });

        kappa.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/-/users'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.headers['x-registry'], settings.paths[0]);
            assert.strictEqual(res.statusCode, 500);
            done();
        });
    });


    it('should fail on first registry error for write operations', function (done) {
        registryA.removeAllListeners('request');
        registryA.on('request', function (req, res) {
            res.statusCode = 500;
            res.end('error');
        });

        kappa.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'post',
            url: '/core-util-is'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.headers['x-registry'], settings.paths[0]);
            assert.strictEqual(res.statusCode, 500);
            done();
        });
    });


    it('should fail when the first registry fails', function (done) {
        registryA.removeAllListeners('request');
        registryA.on('request', function (req, res) {
            res.statusCode = 500;
            res.end('error');
        });

        kappa.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/core-util-is'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.headers['x-registry'], settings.paths[0]);
            assert.strictEqual(res.statusCode, 500);
            done();
        });
    });


    it('should fail when all registries fail', function (done) {
        registryA.removeAllListeners('request');
        registryA.on('request', function (req, res) {
            res.statusCode = 404;
            res.end('not found');
        });

        registryB.removeAllListeners('request');
        registryB.on('request', function (req, res) {
            res.statusCode = 500;
            res.end('error');
        });

        registryC.removeAllListeners('request');
        registryC.on('request', function (req, res) {
            res.statusCode = 500;
            res.end('error');
        });

        kappa.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/core-util-is'
        }, function (res) {
            assert(res);
            assert.strictEqual(res.headers['x-registry'], settings.paths[2]);
            assert.strictEqual(res.statusCode, 500);
            done();
        });
    });

});

