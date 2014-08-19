'use strict';

var url = require('url');
var test = require('tape');
var Hapi = require('hapi');
var nock = require('nock');
var settings = require('../config/defaults');
var kappa = require('../');

test('register', function (t) {
    var server;

    server = new Hapi.Server({ debug: false });
    server.pack.register({
        plugin: kappa,
        options: settings
    }, function (err) {
        t.error(err);
        t.end();
    });
});


test('stream handler', function (t) {
    var uri, server;

    t.plan(5);

    // Configure nock for this single request.
    uri = url.parse(settings.paths[0]);
    nock(uri.protocol + '//' + uri.host).get(uri.pathname + 'cdb').reply(200, {}, {});

    server = new Hapi.Server();
    server.pack.register({
        plugin: kappa,
        options: settings
    }, function (err) {
        t.error(err);

        server.ext('onPostHandler', function (req, next) {
            var res = req.response;
            t.equal(req.response.variety, 'plain');
            t.equal(typeof req.response.source, 'object');
            next();
        });

        server.inject({
            method: 'get',
            url: '/cdb'
        }, function (res) {
            t.ok(res);
            t.strictEqual(res.statusCode, 200);
            t.end()
        });

    });

});
