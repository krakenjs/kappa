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

var Url = require('url');
var Http = require('http');
var Hapi = require('hapi');
var Hoek = require('hoek');
var Wreck = require('wreck');
var Https = require('https');
var Util = require('../util');
var Stats = require('../stats');

require('tls').SLAB_BUFFER_SIZE = 200 * 1024;

Http.globalAgent.maxSockets = Https.globalAgent.maxSockets  = Infinity;
Https.globalAgent.ciphers = 'ALL:!aNULL:!eNULL:!DH:!ECDH:!MD5';

var protocols = {
    'https:': {
        module: Https,
        agent: Https.globalAgent
    },
    'http:': {
        module: Http,
        agent: Http.globalAgent
    }
};

var proto = {

    proxy: function (req, reply) {
        var self, registry, removeAuth, start;

        self = this;
        registry = this.registry;
        removeAuth = !this.isFirst;
        start = Date.now();

        reply.proxy({
            mapUri: function (request, callback) {
                var resource, options;

                resource = Url.resolve(registry, request.url.path.substring(1));
                options = Url.parse(resource);
                options.method = request.method.toLowerCase();
                options.rejectUnauthorized = false;

                // Copy headers, deleting host. The correct host header (different from
                // this host) is automatically added by node http internals.
                options.headers = Hoek.clone(request.raw.req.headers);
                delete options.headers.host;

                // HACK: Only ever send auth to first server.
                // This is a unique situation where, for writes we ONLY go to a single
                // repo so this is a noop, but for GETs we fallback to others. If we
                // fallback, we don't want our Basic auth headers sent to downstream
                // services since 1) they won't be of any use, and 2) they expose us.
                if (removeAuth) {
                    delete options.headers.authorization;
                }

                callback(null, options.format(), options.headers);
            },
            onResponse: function (error, res, request, reply) {
                var good, end;

                if (good = req.server.plugins.good) {
                    // The good plugin is available, so report custom `proxy` events.
                    // NOTE: using the `proxy` event type with reporters that cannot
                    // handle arbitrary event types will fail with errors.
                    end = Date.now();
                    good.monitor.emit('report', 'proxy', {
                        timestamp: end,
                        event: 'proxy',
                        duration: end - start,
                        method: request.method,
                        registry: registry,
                        path: request.path,
                        statusCode: res.statusCode
                    });
                }

                self._onResponse.apply(self, arguments);
            },
            timeout: 5000
        });
    },

    _onResponse: function (error, res, request, reply) {
        var resume, self, response;

        if (error) {
            this._onError(error);
            return;
        }

        // The following statements are enumerated for legibility.
        // This code is a rule set so brevity is harmful.
        if (this.isFirst) {
            if (this.isLast) {
                // One and only, so just fulfill the response.
                resume = false;
            } else {
                // For the primary registry, only resume on 404
                resume = res.statusCode === 404;
            }
        } else {
            if (this.isLast) {
                // Last registry, so nowhere to go from here.
                resume = false;
            } else {
                // Non-primary registries resume on any non-success.
                resume = res.statusCode !== 200;
            }
        }

        if (resume) {
            // This particular response has been deemed unnecessary
            // so discard it and move on.
            res.socket && res.socket.destroy();
            this.onComplete();
            return;
        }

        self = this;
        response = request.raw.res;
        response.once('error', this._onError.bind(this));
        response.once('finish', this.onComplete);

        Wreck.read(res, { json: true }, function (err, payload) {
            var response;

            if (err) {
                // Actual parsing error, so fail immediately.
                // The server returned an invalid response
                // so the client should be notified.
                err = Hapi.error.wrap(err);
                err.output.headers['x-registry'] = self.registry;
                reply(err);
                return;
            }

            response = reply(payload).code(res.statusCode);
            response.header('x-registry', self.registry);

            Object.keys(res.headers)
                .filter(Util.isValidHeader)
                .forEach(function (key) {
                    response.header(key, res.headers[key]);
                });
        });

    },

    _onError: function (err) {
        // TODO: Log error even though we ignore it?
        // If primary registry is down, always fail. This is for the scenario
        // in which there may be naming collisions and falling back might return
        // a node module different than the desired/intended one.
        this.onComplete(this.isFirst ? err : null);
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

        onComplete: {
            value: undefined,
            writable: true,
            enumerable: true
        }

    });

};


// Setup samplers for properties of each protocol
Object.keys(protocols).forEach(function (protocol) {
    var agent = protocols[protocol].agent;

    Stats.sample(protocol + 'sockets:queued', function getRequestQueueSize() {
        return Util.sum(agent.requests);
    });

    Stats.sample(protocol + 'sockets:active', function getActiveSocketCount() {
        return Util.sum(agent.sockets);
    });

    Stats.sample(protocol + 'sockets:max', function getMaxSockets() {
        return agent.maxSockets;
    });
});
