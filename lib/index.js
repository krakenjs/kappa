/*───────────────────────────────────────────────────────────────────────────*\
│  Copyright (C) 2013 eBay Software Foundation                                │
│                                                                             │
│   ,'""`.                                                                    │
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
    log = require('./log'),
    delegate = require('./delegate');



exports.create = function (settings) {
    var server, vhost, read, write, logger;

    server = new hapi.Server('localhost', parseInt(process.env['KAPPA_PORT'], 10) || parseInt(process.env['PORT'], 10) || 8001);
    vhost = settings.vhost;

    read = delegate.createHandler(settings.paths);
    write = delegate.createHandler(settings.paths.slice(0, 1));

    // GETs always get proxied
    server.route({
        method: 'GET',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: read.handler,
            payload: 'stream'
        }
    });


    // User-info GETs, and al other POST, PUT, and DELETE operations
    // always go to first service only (write delegate). This includes
    // user-related operations, publishes, tags, etc.
    server.route({
        method: 'GET',
        path: '/-/user/{p*}',
        vhost: vhost,
        handler: write.handler,
        config: {
            payload: 'raw'
        }
    });

    server.route({
        method: 'GET',
        path: '/-/users',
        vhost: vhost,
        config: {
            handler: write.handler,
            payload: 'stream'
        }
    });

    server.route({
        method: 'GET',
        path: '/_users/{p*}',
        vhost: vhost,
        config: {
            handler: write.handler,
            payload: 'stream'
        }
    });

    server.route({
        method: 'GET',
        path: '/public_users/{p*}',
        vhost: vhost,
        config: {
            handler: write.handler,
            payload: 'stream'
        }
    });

    server.route({
        method: 'GET',
        path: '/-/user-by-email/{p*}',
        vhost: vhost,
        config: {
            handler: write.handler,
            payload: 'stream'
        }
    });

    server.route({
        method: 'POST',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write.handler,
            payload: 'stream'
        }
    });

    server.route({
        method: 'PUT',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write.handler,
            payload: 'stream'
        }
    });

    server.route({
        method: 'DELETE',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write.handler,
            payload: 'stream'
        }
    });



    // Logging
    logger = log.createLogger(settings);

    server.on('log', logger.log.bind(logger));
    server.on('request', function (request, event) {
        //console.log(event);
        //server.log(event.tags, event.data);
//        console.log('>', event);
//        event.method = request.method.toUpperCase();
//        server.log(event.tags, [ request.id, request.method.toUpperCase() ].join(' '));
//        server.log(event.tags, [ request.id, request.method.toUpperCase(), JSON.stringify(event.data) ].join(' '))
    });


    // Output some stats periodically
//    setInterval(function () {
//        server.log(['info', 'stats'], delegate.getStats());
//    }, 7500);


    return server;
};