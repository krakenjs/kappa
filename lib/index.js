/***@@@ BEGIN LICENSE @@@***
Copyright (c) 2013, eBay Software Foundation All rights reserved.  Use of the accompanying software, in source and binary forms, is permitted without modification only and provided that the following conditions are met:  Use of source code must retain the above copyright notice, this list of conditions and the following disclaimer.  Use in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.  Neither the name of eBay or its subsidiaries nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.  All rights not expressly granted to the recipient in this license are reserved by the copyright holder.  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
***@@@ END LICENSE @@@***/
'use strict';

var hapi = require('hapi'),
    log = require('./log'),
    stats = require('./stats'),
    delegate = require('./delegate');



exports.create = function (settings) {
    var server, vhost, read, write, logger;

    server = new hapi.Server('localhost', parseInt(process.env['KAPPA_PORT'], 10) || parseInt(process.env['PORT'], 10) || 8000);
    vhost = settings.vhost;

    read = delegate.createHandler(settings.paths);
    write = delegate.createHandler(settings.paths.slice(0, 1));

    // GETs always get proxied
    server.route({
        method: 'GET',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: read,
            payload: 'stream'
        }
    });


    // Statistics reporter
    server.route({
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
    server.route({
        method: 'GET',
        path: '/-/user/{p*}',
        vhost: vhost,
        handler: write,
        config: {
            payload: 'stream'
        }
    });

    server.route({
        method: 'GET',
        path: '/-/users',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    server.route({
        method: 'GET',
        path: '/_users/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    server.route({
        method: 'GET',
        path: '/public_users/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    server.route({
        method: 'GET',
        path: '/-/user-by-email/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    server.route({
        method: 'POST',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    server.route({
        method: 'PUT',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });

    server.route({
        method: 'DELETE',
        path: '/{p*}',
        vhost: vhost,
        config: {
            handler: write,
            payload: 'stream'
        }
    });


    // Logging
    logger = log.createLogger(settings);
    server.on('log', logger.log.bind(logger));

    server.on('request', function (req, event) {
        server.log(event.tags, event.data);
    });

    server.on('response', function (req) {
        server.log(['info', 'request'], [ req.info.remoteAddress, req.method.toUpperCase(), req.path, req.raw.res.statusCode ].join(' '));
    });

    return server;
};