'use strict';

var url  = require('url'),
    path = require('path'),
    Hapi = require('hapi'),
    http = require('request'),
    each = require('./fallback');


function validate(uri) {
    var parsed = url.parse(uri);

    // ensure we're using http[s]
    if (!(/^http[s]?:/.test(parsed.protocol))) {
        throw new Error('Invalid protocol \'' + parsed.protocol + '\'');
    }

    return parsed;
}


exports = module.exports = {

    handler: function (urls) {

        var registries = urls.map(validate);

        return function (request) {

            function handler(registry, next) {
                var options, childRequest;

                // Prepare options for spawned request
                registry = Hapi.utils.clone(registry);
                registry.pathname = path.join(registry.pathname, request.path);

                options = {
                    uri:    url.format(registry),
                    method: request.method,
                    qs:     request.query,
                    headers: {}
                };


                if (request.method.toLowerCase() !== 'get' && request.method.toLowerCase() !== 'head') {
                    // Copy headers for POST-like requests. (In this case we want
                    // to pass auth credentials, etc.
                    options.headers = Hapi.utils.clone(request.raw.req.headers);
                    delete options.headers.host;
                }


                // Spawn new request
                childRequest = http(options);

                childRequest.on('response', function (response) {
                    // Allow 401, 409, etc through
                    if (response.statusCode === 404 || response.statusCode >= 500) {
                        Hapi.Log.event('error', 'Invalid or error response from ' + options.uri + ' (' + response.statusCode + ')');
                        next();
                        return;
                    }

                    next(null, response);
                });

                childRequest.on('error', function (err) {
                    Hapi.Log.event('error', 'Unable to reach ' + options.uri + ' (' + err.message + ')');
                    next();
                });

                if (request.raw.req.readable) {
                    // This *should* cover POST-like requests without having to inspect methods ourselves.
                    request.raw.req.pipe(childRequest);
                    request.raw.req.resume();
                }
            }

            function complete(err, response, registry) {
                if (err) {
                    Hapi.Log.event('error', err.message);
                    Hapi.Log.event('error', err.stack);
                    request.reply(err);
                    return;
                }

                request.reply(response || Hapi.Error.notFound('Resource not found'));
            }

            each(registries, handler, complete);

        }

    }

};
