'use strict';

var url = require('url');
var test = require('tape');
var Hapi = require('hapi');
var nock = require('nock');
var settings = require('../config/defaults');
var kappa = require('../');
var Stream = require('stream');
var Wreck = require('wreck');

test('proxy octet-streams', function (t) {
    var uri, server, stream;

    // Configure nock for this single request.
    uri = url.parse(settings.paths[0]);

    nock(uri.protocol + '//' + uri.host).get(uri.pathname + 'cdb').reply(200, function () {
      stream = new Stream.PassThrough();
      stream.write('pre'); // doing this to flush the headers early

      return stream;
    }, {'content-type': 'application/octet-stream'});

    t.plan(6);

    server = new Hapi.Server();
    server.connection();
    server.register({
        register: kappa,
        options: settings
    }, function (err) {
        t.error(err);

        server.start(function () {
            Wreck.request('get', 'http://localhost:' + server.info.port + '/cdb', null, function (err, res) {
                t.error(err);
                t.strictEqual(res.statusCode, 200);
                Wreck.toReadableStream('post').pipe(stream);

                Wreck.read(res, null, function (err, payload) {
                  t.error(err);
                  t.ok(payload);
                  t.equal(payload.toString(), 'prepost');
                  server.stop();
                });
            });
        });
    });
});
