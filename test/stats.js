/*global describe:false, it:false, before:false*/
'use strict';

var assert = require('chai').assert,
    Hapi = require('hapi');



describe('stats', function () {

    var settings, server;

    settings = {
        "paths": [
            "http://localhost:5984/registry/_design/ghost/_rewrite/",
            "https://registry.npmjs.org/"
        ],
        "vhost": "npm.mydomain.com",
        "logLevel": "info"

    };


    before(function (done) {

        server = new Hapi.Server();
        server.pack.require('../', settings, function (err) {
            assert.ok(!err);
            done();
        });

    });


    it('should report stats', function (done) {

        server.inject({
            headers: { host: 'npm.mydomain.com' },
            method: 'get',
            url: '/-/stats'
        }, function (res) {
            var stats;

            assert(res);
            assert(/^application\/json/.test(res.headers['content-type']));
            assert.strictEqual(res.statusCode, 200);

            assert(stats = res.result);
            assert.isDefined(stats.counters);
            assert.isDefined(stats.hostname);
            assert.isDefined(stats.loadavg);
            assert.isDefined(stats.totalmem);
            done();
        });

    });

});