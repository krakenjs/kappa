'use strict';

var url  = require('url'),
    path = require('path'),
    util = require('util'),
    Hapi = require('hapi'),
    http = require('http'),
    stream = require('stream'),
    stats = require('../stats'),
    each = require('./fallback');


var connections = 0;
var requests = 0;
var errors = 0;
var agent = new http.Agent({ maxSockets: 50 });


exports.getStats = function () {
    return {
        errors: errors,
        sockets: {
            max: stats.getMaxSockets(agent),
            active: stats.getActiveSocketCount(agent)
        },
        requests: {
            active: connections,
            total: requests,
            queued: stats.getRequestQueueSize(agent)
        }
    };
};


exports.createHandler = function (urls) {
    var registries = urls.map(validate);

    return function handler(req) {
        var method, pkg, attempts;

        method = req.method.toLowerCase();
        pkg = req.path.substring(1);
        attempts = 0;

        req.log('info', [req.id, method.toUpperCase(), pkg].join(' '));

        function handler(registry, next) {
            var uri, options, childRequest, start;

            attempts += 1;

            // Prepare options for spawned request
            uri = url.parse(url.resolve(registry, pkg));
            options = {
                hostname: uri.hostname,
                headers: {},
                method: method,
                host: uri.host,
                port: uri.port,
                path: uri.path,
                auth: uri.auth,
                agent: agent
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

                req.log('info', [req.id, method.toUpperCase(), uri.href, res.statusCode, process.hrtime(start)].join(' '));

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
                req.log('error', [req.id, method.toUpperCase(), uri.href, String(err), JSON.stringify(err)].join(' '));
                next(err);
            });

            req.log('info', [req.id, method.toUpperCase(), uri.href].join(' '));
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
        }

        each(registries, handler, complete);
    }

};


/**
 * A noop write stream for handling discarded responses
 * @constructor
 */
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


/**
 * Ensures the provided uri is http[s]
 * @param uri
 * @returns {*}
 */
function validate(uri) {
    var parsed = url.parse(uri);

    // ensure we're using http[s]
    if (!(/^http[s]?:/.test(parsed.protocol))) {
        throw new Error('Invalid protocol \'' + parsed.protocol + '\'');
    }

    return uri;
}