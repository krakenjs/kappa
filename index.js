/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2013 eBay Software Foundation                                │
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

var hapi = require('hapi'),
    url = require('url'),
    pkg = require('./package'),
    log = require('./lib/log'),
    stats = require('./lib/stats'),
    delegate = require('./lib/delegate'),
    stats = require('./lib/stats'),
    defaults = require('./config/defaults');


module.exports = {

    name: pkg.name,

    version: pkg.version,

    register: function (plugin, options, next) {
        var settings, read, write, vhost, logger;

        settings = hapi.utils.applyToDefaults(defaults, options);
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
                    output: 'stream'
                }
            }
        });

        plugin.route({
            method: 'PUT',
            path: '/{p*}',
            vhost: vhost,
            config: {
                handler: write
            }
        });

        plugin.route({
            method: 'DELETE',
            path: '/{p*}',
            vhost: vhost,
            config: {
                handler: write
            }
        });

        plugin.ext('onRequest', function (request, next) {
            stats.increment('http:requests:total');
            stats.increment('http:requests:active');
            next();
        });

        //Rewrite tarball URLs to kappa so that everything comes through kappa.
        //This is useful for metrics, logging, white listing, etc.
        plugin.ext('onPostHandler', function (request, next) {
            var response;

            response = request.response;

            function rewrite(tarball) {
                tarball = url.parse(tarball);

                tarball.host = tarball.hostname = settings.vhost || request.server.info.host;
                tarball.port = request.server.info.port;

                return tarball.format();
            }

            if (!response.isBoom && response.variety === 'plain') {

                if (typeof response.source === 'object') {

                    if (response.source.versions) {
                        Object.keys(response.source.versions).forEach(function (version) {
                            response.source.versions[version].dist.tarball = rewrite(response.source.versions[version].dist.tarball);
                        });
                    }
                    else if (response.source.dist) {
                        response.source.dist.tarball = rewrite(response.source.dist.tarball);
                    }

                }
            }

            next();
        });

        plugin.ext('onPreResponse', function (request, next) {
            var response = request.response;

            stats.decrement('http:requests:active');

            if (response.isBoom) {
                stats.increment('http:errors');

                request.log('error', response.message);
            }

            next();
        });

        // Logging
        logger = log.createLogger(settings);
        plugin.events.on('log', logger.log.bind(logger));

        plugin.events.on('request', function (req, event) {
            plugin.log(event.tags, event.data);
        });

        plugin.events.on('response', function (req) {
            plugin.log(['info', 'request'], [ req.info.remoteAddress, req.method.toUpperCase(), req.path, req.raw.res.statusCode ].join(' '));
        });

        next();
    }
};