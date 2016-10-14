/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2016 PayPal                                                  │
 │                                                                             │
 │hh ,'""`.                                                                    │
 │  / _  _ \  Licensed under the Apache License, Version 2.0 (the "License");  │
 │  |(@)(@)|  you may not use this file except in compliance with the License. │
 │  )  __  (  You may obtain a copy of the License at                          │
 │ /,'))((`.\                                                                  │
 │(( ((  )) ))    http://www.apache.org/licenses/LICENSE-2.0                   │
 │ `\ `)(' /'                                                                  │
 │                                                                             │
 │   Unless required by applicable law or agreed to in writing, software       │
 │   distributed under the License is distributed on an "AS IS" BASIS,         │
 │   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  │
 │   See the License for the specific language governing permissions and       │
 │   limitations under the License.                                            │
 \*───────────────────────────────────────────────────────────────────────────*/
'use strict';

var Url = require('url');
var Hoek = require('hoek');
var pkg = require('./package');
var util = require('./lib/util');
var stats = require('./lib/stats');
var delegate = require('./lib/delegate');
var defaults = require('./config/defaults');


exports.register = function register(plugin, options, next) {
    var settings, read, write, vhost, logger;

    settings = Hoek.applyToDefaults(defaults, options);
    settings.paths = settings.paths.map(function (path) {
        return util.suffix(path, '/');
    });

    read = delegate.createHandler(settings.paths);
    write = delegate.createHandler(settings.paths.slice(0, 1));
    vhost = settings.vhost;

    // GETs always get proxied
    plugin.route({
        method: 'GET',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: read
        }
    });


    // Statistics reporter
    plugin.route({
        method: 'GET',
        path: '/-/stats',
        vhost: vhost,
        config: {
            handler: stats.handler
        }
    });


    // User-info GETs, and all other POST, PUT, and DELETE operations
    // always go to first service only (write delegate). This includes
    // user-related operations, publishes, tags, etc.
    plugin.route({
        method: 'GET',
        path: '/-/user/{p*}',
        vhost: vhost,
        config: {
            handler: write
        }
    });

    plugin.route({
        method: 'GET',
        path: '/-/users',
        vhost: vhost,
        config: {
            handler: write
        }
    });

    plugin.route({
        method: 'GET',
        path: '/_users/{p*}',
        vhost: vhost,
        config: {
            handler: write
        }
    });

    plugin.route({
        method: 'GET',
        path: '/public_users/{p*}',
        vhost: vhost,
        config: {
            handler: write
        }
    });

    plugin.route({
        method: 'GET',
        path: '/-/user-by-email/{p*}',
        vhost: vhost,
        config: {
            handler: write
        }
    });

    plugin.route({
        method: 'POST',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: {
                output: 'stream',
                parse: false
            }
        }
    });

    plugin.route({
        method: 'PUT',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: {
                output: 'stream',
                parse: false
            }
        }
    });

    plugin.route({
        method: 'DELETE',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: {
                output: 'stream',
                parse: false
            }
        }
    });

    plugin.route({
        method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', '*'],
        path: '/_utils/{p*}',
        vhost: vhost,
        config: {
            handler: function forbidden(req, reply) {
                var contentType, payload;

                contentType = req.headers['content-type'];

                if (contentType && contentType.indexOf('application/json') > -1) {
                    payload = {"error":"forbidden","reason":"public access is not allowed"};
                } else {
                    payload = '<!DOCTYPE html><h1>Error 403: Forbidden</h1><p>Public access is not allowed.</p>';
                }

                reply(payload).code(403).header('Cache-Control', 'no-cache');
            }
        }
    });

    plugin.ext('onRequest', function (request, next) {
        stats.increment('http:requests:total');
        stats.increment('http:requests:active');
        next();
    });


    if (settings.rewriteTarballs) {
        // Rewrite tarball URLs to kappa so that everything comes through kappa.
        // This is useful for metrics, logging, white listing, etc.
        plugin.ext('onPostHandler', function (request, next) {
            var response, rewrite, host, registry;

            response = request.response;
            if (!response.isBoom && response.variety === 'plain') {
                host = util.hostInfo(request);
                registry = Url.parse(response.headers['x-registry'] || '');
                rewrite = util.rewriter(host, registry);
                util.transform(response.source, 'tarball', rewrite);
            }

            next();
        });
    }


    plugin.ext('onPreResponse', function (request, next) {
        var response = request.response;

        stats.decrement('http:requests:active');

        if (response.isBoom || response.statusCode >= 500) {
            stats.increment('http:errors');
            request.log('error', response.message);
        }

        next();
    });

    next();
};

exports.register.attributes = {

    name: pkg.name,

    version: pkg.version

};
