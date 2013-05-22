'use strict';

var url  = require('url'),
    path = require('path'),
    Hapi = require('hapi'),
    http = require('http'),
    request = require('request'),
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
            var rawRequest, method, pkg, attempts;

            rawRequest = req.raw.req;
            method = req.method.toLowerCase();
            pkg = req.path.substring(1);
            attempts = 0;

            req.log('info', req.id + ' ' + method.toUpperCase() + ' ' + pkg);

            function handler(registry, next) {
                var options, childRequest, start;

                attempts += 1;

                // Prepare options for spawned request
                registry = url.parse(url.resolve(registry, pkg));
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


                // Spawn new request
                requests += 1;
                connections += 1;
                start = process.hrtime();

                childRequest = request(options);
                childRequest.on('response', function (response) {
                    req.log('info', req.id + ' ' + method.toUpperCase() + ' ' + options.uri + ' ' + response.statusCode + ' ' + process.hrtime(start));

                    var fallback = (attempts !== registries.length) && (response.statusCode === 404 || response.statusCode >= 500);
                    childRequest.on('end', function end() {
                        connections -= 1;
                        next(null, !fallback);
                    });

                    childRequest.on('close', function (hadError) {
                        if (!hadError) {
                            req.log('info', req.id + ' ' + method.toUpperCase() + ' ' + pkg + ' connection closed.');
                        }
                    });

                    !fallback && childRequest.pipe(req.raw.res);
                });

                childRequest.on('error', function (err) {
                    connections -= 1;
                    errors += 1;
                    req.log('error', req.id + ' ' + method.toUpperCase() + ' ' + options.uri + ' ' + String(err) + ' ' + err.stack);
                    next(err);
                });

                req.log('info', req.id + ' ' + method.toUpperCase() + ' ' + options.uri);
                rawRequest.pipe(childRequest);
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

                req.log('info', req.id + ' ' + method.toUpperCase() + ' ' + pkg + ' complete');
                req.log('info', JSON.stringify({ connections: connections, requests: requests, errors: errors}, 0));
            }

            each(registries, handler, complete);
        }

    }

};