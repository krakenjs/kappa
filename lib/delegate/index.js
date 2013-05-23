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
var agent = new http.Agent({ maxSockets: 250 });


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
        var total, method, pkg, attempts;

        total = process.hrtime();
        method = req.method.toLowerCase();
        pkg = req.path.substring(1);
        attempts = 0;

        function log() {
            var tags, data;
            tags = arguments[0];
            data = log._data.concat(Array.prototype.slice.call(arguments, 1));
            req.log(tags, data.join(' '));
        }

        log._data = [req.id, method.toUpperCase()];
        log('info', pkg);

        function handler(registry, next) {
            var uri, options, childRequest, start;

            attempts += 1;

            // Prepare options for spawned request
            uri = url.parse(url.resolve(registry, pkg));
            options = {
                hostname: uri.hostname,
                host: uri.host,
                port: uri.port,
                path: uri.path,
                auth: uri.auth,
                method: method,
                agent: agent,
                headers: {}
            };

            if (method !== 'get' && method !== 'head') {
                // Copy headers for POST-like requests. (In this case we want
                // to pass auth credentials, etc.
                options.headers = Hapi.utils.clone(req.raw.req.headers);
                delete options.headers.host;
            }

            function response(res) {
                var fallback, dest;

                log('info', uri.href, res.statusCode, String(process.hrtime(start)));

                fallback = (attempts !== registries.length) && (res.statusCode === 404);
                dest = fallback ? new WriteStream() : req.raw.res;
                pipe(res, dest);

                res.on('close', function () {
                    connections -= 1;
                    next(null, false);
                });

                res.on('end', function () {
                    connections -= 1;
                    next(null, !fallback);
                });
            }

            function error(err) {
                connections -= 1;
                errors += 1;
                log('error', uri.href, err.message, err.stack || '');
                next(err);
            }

            // Spawn new request
            requests += 1;
            connections += 1;
            start = process.hrtime();

            childRequest = http.request(options);
            childRequest.on('response', response);
            childRequest.on('error', error);
            req.raw.req.pipe(childRequest);

            log('info', uri.href);
        }


        function complete(err, handled/*, registry, registries*/) {
            if (req.reply) {
                if (err) {
                    req.reply(err);
                    return;
                }

                if (!handled) {
                    req.reply(Hapi.Error.notFound('Resource not found'));
                }
            }

            log('info', pkg, req.raw.res.statusCode, String(process.hrtime(total)));
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
 * Pipes a src response to a dest response
 * @param src
 * @param dest
 */
function pipe(src, dest) {
    dest.statusCode = src.statusCode;

    Object.keys(src.headers).forEach(function (header) {
        dest.setHeader(header, src.headers[header]);
    });

    src.pipe(dest);
}


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