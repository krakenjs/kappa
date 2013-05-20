'use strict';

var url  = require('url'),
    path = require('path'),
    Hapi = require('hapi'),
    http = require('http'),
    request = require('request'),
    each = require('./fallback');


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
            var rawRequest, pkg, attempts;

            rawRequest = req.raw.req;
            pkg = req.path.substring(1);
            attempts = 0;


            function handler(registry, next) {
                var method, options, childRequest;

                attempts += 1;

                // Prepare options for spawned request
                registry = url.parse(url.resolve(registry, pkg));
                method = req.method.toLowerCase();
                options = {
                    uri:    url.format(registry),
                    method: req.method,
                    qs:     req.query,
                    headers: {}
                };

                if (method !== 'get' && method !== 'head') {
                    // Copy headers for POST-like requests. (In this case we want
                    // to pass auth credentials, etc.
                    options.headers = Hapi.utils.clone(req.raw.req.headers);
                    delete options.headers.host;
                }

                req.log('info', options);

                // Spawn new request
                childRequest = request(options);
                childRequest.on('response', function (response) {
                    req.log('info', 'Child request for ' + options.uri + ' responded with statusCode ' + response.statusCode);

                    if (attempts !== registries.length && (response.statusCode === 404 || response.statusCode >= 500)) {
                        req.log('info', 'Package unavailable at ' + options.uri + ' (' + response.statusCode + ')');
                        next(null, false);
                        return;
                    }

                    childRequest.pipe(req.raw.res);
                    childRequest.on('end', function () {
                        req.log('info', 'Child request for ' + options.uri + ' responded complete.');
                        next(null, true);
                    });
                });

                childRequest.on('error', function (err) {
                    req.log('error', 'Unable to reach ' + options.uri + ' (' + err.message + ')');
                    next(err);
                });

                req.log('info', 'Initiating child request for ' + options.uri + '.');
                rawRequest.pipe(childRequest);
            }


            function complete(err, handled/*, registry, registries*/) {
                req.log('info', pkg + ' complete');
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
            }

            each(registries, handler, complete);
        }

    }

};


function WriteRead() {
    WriteRead.super_.apply(this, arguments);

    this.writable = true;
    this.readable = true;
    this.data = [];
    this.encoding = 'utf8';
    this._cursor = 0;

    this.on('finish', function () {
        this.data = Buffer.concat(this.data);
    }.bind(this));
}

require('util').inherits(WriteRead, require('stream').Duplex);


WriteRead.prototype._write = function (data, encoding, done) {
    this.encoding = encoding;
    this.data.push(data);
    done();
};


WriteRead.prototype._read = function (size) {
    var chunk = null;
    if (this._cursor <= this.data.length) {
        chunk = this.data.slice(this._cursor, size).toString(this.encoding);
    }
    this.push(chunk);
    this._cursor += size;
};