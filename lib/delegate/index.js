'use strict';

var url  = require('url'),
    path = require('path'),
    util = require('util'),
    Hapi = require('hapi'),
    http = require('http'),
    stream = require('stream'),
    each = require('./fallback');


var connections = 0;
var requests = 0;
var errors = 0;


function validate(uri) {
    var parsed = url.parse(uri);

    // ensure we're using http[s]
    if (!(/^http[s]?:/.test(parsed.protocol))) {
        throw new Error('Invalid protocol \'' + parsed.protocol + '\'');
    }

    return uri;
}


exports = module.exports = {

    createHandler: function (urls) {
        var registries = urls.map(validate);

        return function (req) {
            var method, pkg, attempts;

            method = req.method.toLowerCase();
            pkg = req.path.substring(1);
            attempts = 0;

            req.log('info', [req.id, method.toUpperCase(), pkg].join(' '));

            function handler(registry, next) {
                var uri, options, childRequest, start;

                attempts += 1;

                // Prepare options for spawned request
                uri = url.resolve(registry, pkg);
                registry = url.parse(uri);
                options = {
                    hostname: registry.hostname,
                    headers: {},
                    method: method,
                    host: registry.host,
                    port: registry.port,
                    path: registry.path,
                    auth: registry.auth
                };

                if (method !== 'get' && method !== 'head') {
                    // Copy headers for POST-like requests. (In this case we want
                    // to pass auth credentials, etc.
                    options.headers = Hapi.utils.clone(req.raw.req.headers);
                    delete options.headers.host;
                }

                // Spawn new request
                requests += 1;
                connections += 1;
                start = process.hrtime();

                childRequest = http.request(options, function (res) {
                    var fallback, dest;
                    req.log('info', [req.id, method.toUpperCase(), uri, res.statusCode, process.hrtime(start)].join(' '));

                    fallback = (attempts !== registries.length) && (res.statusCode === 404);
                    dest = fallback ? new WriteStream() : req.raw.res;
                    dest.statusCode = res.statusCode;
                    Object.keys(res.headers).forEach(function (header) {
                        dest.setHeader(header, res.headers[header]);
                    });

                    res.pipe(dest);
                    res.on('end', function () {
                        connections -= 1;
                        next(null, !fallback);
                    });
                });

                childRequest.on('error', function (err) {
                    connections -= 1;
                    errors += 1;
                    req.log('error', [req.id, method.toUpperCase(), uri, String(err), JSON.stringify(err)].join(' '));
                    next(err);
                });

                req.log('info', [req.id, method.toUpperCase(), uri].join(' '));
                req.raw.req.pipe(childRequest);
            }


            function complete(err, handled/*, registry, registries*/) {

                if (req.reply) {
                    if (err) {
                        req.log('error', err);
                        req.reply(err);
                        return;
                    }

                    if (!handled) {
                        req.reply(Hapi.Error.notFound('Resource not found'));
                    }
                }

                req.log('info', [req.id, method.toUpperCase(), pkg, 'complete'].join(' '));
                req.log('info', JSON.stringify({ connections: connections, requests: requests, errors: errors}, 0));
            }

            each(registries, handler, complete);
        }

    }

};


function WriteStream() {
    WriteStream.super_.apply(this, arguments);
    this.statusCode = 200;
}
util.inherits(WriteStream, stream.Writable);

WriteStream.prototype.setHeader = function (name, value) {
    // noop
};

WriteStream.prototype._write = function (chunk, encoding, callback) {
    // noop
    callback();
};
