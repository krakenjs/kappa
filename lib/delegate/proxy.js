/*───────────────────────────────────────────────────────────────────────────*\
│  Copyright (C) 2014 eBay Software Foundation                                │
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

var url = require('url'),
    http = require('http'),
    hapi = require('hapi'),
    nipple = require('nipple'),
    https = require('https'),
    util = require('../util'),
    stats = require('../stats'),
    DevNull = require('./devnull');

require('tls').SLAB_BUFFER_SIZE = 200 * 1024;

http.globalAgent.maxSockets = https.globalAgent.maxSockets  = Infinity;

https.globalAgent.ciphers = 'ALL:!aNULL:!eNULL:!DH:!ECDH:!MD5';

var protocols = {
    'https:': {
        module: https,
        agent: https.globalAgent
    },
    'http:': {
        module: http,
        agent: http.globalAgent
    }
};

var proto = {

    proxy: function (req, reply) {
        var resource, options;

        resource = url.resolve(this.registry, req.url.path.substring(1));
        options = url.parse(resource);
        options.method = req.method.toLowerCase();
        options.rejectUnauthorized = false;

        // Copy headers, deleting host. The correct host header (different from
        // this host) is automatically added by node http internals.
        options.headers = hapi.utils.clone(req.raw.req.headers);
        delete options.headers.host;

        // HACK: Only ever send auth to first server.
        // This is a unique situation where, for writes we ONLY go to a single
        // repo so this is a noop, but for GETs we fallback to others. If we
        // fallback, we don't want our Basic auth headers sent to downstream
        // services since 1) they won't be of any use, and 2) they expose us.
        this.isFirst || delete options.headers.authorization;

        reply.proxy({
            mapUri: function (req, callback) {
                callback(null, options.format(), options.headers);
            },
            onResponse: this._onresponse.bind(this),
            timeout: 5000
        });
    },

    _onresponse: function (error, incoming, outgoing, reply) {
        var cont, response, self;

        self = this;

        if (error) {
            return this._onerror(error);
        }

        function respond(body) {

            response = reply(body).code(incoming.statusCode);

            response.header('x-registry', self.registry);

            Object.keys(incoming.headers)
                .filter(util.isValidHeader)
                .forEach(function (header) {
                    response.header(header, incoming.headers[header]);
                });
        }

        cont = self.isFirst ? incoming.statusCode === 404 : (!self.isLast && incoming.statusCode !== 200);
        response = cont && !this.isLast ? new DevNull() : outgoing.raw.res;

        response.once('error', self._onerror.bind(self));
        response.once('finish', self.oncomplete);

        if (cont && !this.isLast) {
            incoming.pipe(response);
            return;
        }

        if (incoming.headers['content-type'] && incoming.headers['content-type'].indexOf('application/json') > -1) {

            nipple.read(incoming, function (err, body) {
                if (err) {
                    return reply(err);
                }

                body = util.tryParse(body);

                if (body instanceof Error) {
                    return self._onerror(body);
                }

                respond(body);
            });

            return;
        }

        respond(incoming);
    },

    _onerror: function (err) {
        // TODO: Log error even though we ignore it?
        // If primary registry is down, always fail. This is for the scenario
        // in which there may be naming collisions and falling back might return
        // a node module different than the desired/intended one.
        this.oncomplete(this.isFirst ? err : null);
    },


    get isFirst() {
        return this.index === 0;
    },


    get isLast() {
        return this.index === this.registries.length - 1;
    }
};


exports.create = function (item, index, items) {

    return Object.create(proto, {

        registry: {
            value: item,
            enumerable: true
        },

        index: {
            value: index,
            enumerable: true
        },

        registries: {
            value: items,
            enumerable: true
        },

        oncomplete: {
            value: undefined,
            writable: true,
            enumerable: true
        }

    });

};


// Setup samplers for properties of each protocol
Object.keys(protocols).forEach(function (protocol) {
    var agent = protocols[protocol].agent;

    stats.sample(protocol + 'sockets:queued', function getRequestQueueSize() {
        return util.sum(agent.requests);
    });

    stats.sample(protocol + 'sockets:active', function getActiveSocketCount() {
        return util.sum(agent.sockets);
    });

    stats.sample(protocol + 'sockets:max', function getMaxSockets() {
        return agent.maxSockets;
    });
});
