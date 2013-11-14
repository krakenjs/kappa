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

var log = require('./lib/log'),
    stats = require('./lib/stats'),
    delegate = require('./lib/delegate');



exports.register = function (plugin, options, next) {
    var vhost, read, write, logger;

    read = delegate.createHandler(options.paths);
    write = delegate.createHandler(options.paths.slice(0, 1));
    vhost = options.vhost;

    // GETs always get proxied
    plugin.route({
        method: 'GET',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: read,
            payload: 'stream'
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
        handler: write,
        config: {
            payload: 'stream'
        }
    });

    plugin.route({
        method: 'GET',
        path: '/-/users',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    plugin.route({
        method: 'GET',
        path: '/_users/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    plugin.route({
        method: 'GET',
        path: '/public_users/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    plugin.route({
        method: 'GET',
        path: '/-/user-by-email/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    plugin.route({
        method: 'POST',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    plugin.route({
        method: 'PUT',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    plugin.route({
        method: 'DELETE',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });


    // Logging
    logger = log.createLogger(options);
    plugin.events.on('log', logger.log.bind(logger));

    plugin.events.on('request', function (req, event) {
        plugin.log(event.tags, event.data);
    });

    plugin.events.on('response', function (req) {
        plugin.log(['info', 'request'], [ req.info.remoteAddress, req.method.toUpperCase(), req.path, req.raw.res.statusCode ].join(' '));
    });


    next();
};