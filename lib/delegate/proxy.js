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
var Http = require('http');
var Hapi = require('hapi');
var Hoek = require('hoek');
var Zlib = require('zlib');
var Wreck = require('wreck');
var Https = require('https');
var Util = require('../util');
var ReadableStream = require('stream').Readable;
var Boom = require('boom');
var ContentType = require('content-type');

require('tls').SLAB_BUFFER_SIZE = 200 * 1024;

Http.globalAgent.maxSockets = Https.globalAgent.maxSockets  = Infinity;
Https.globalAgent.ciphers = 'ALL:!aNULL:!eNULL:!DH:!ECDH:!MD5';


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

                // remove the x-forwarded-proto header because the couchapp doesn't
                // handle proto chains (i.e., "https, http").
                if (options.headers['x-forwarded-proto']) {
                    delete options.headers['x-forwarded-proto'];
                }

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

                if (good = request.server.plugins.good) {
                    // The good plugin is available, so report custom `proxy` events.
                    // NOTE: using the `proxy` event type with reporters that cannot
                    // handle arbitrary event types will fail with errors.
                    end = Date.now();
                    good.monitor.emit('report', 'proxy', {
                        timestamp: end,
                        event: 'proxy',
                        duration: end - start,
                        method: request.method,
                        registry: Url.parse(registry).host,
                        path: request.path,
                        statusCode: res ? res.statusCode : -1,
                        id: request.id,
                        tags: 'proxy',
                        data: {}
                    });
                }

                self._onResponse.apply(self, arguments);
            },
            timeout: 20000
        });
    },

    _onResponse: function (error, res, request, reply) {
        var self, response, contentType;

        if (error) {
            // Ensure any necessary socket cleanup is done.
            res && res.socket && res.socket.destroy();
            this.onComplete(error);
            return;
        }

        if (!this.isLast && res.statusCode === 404) {
            // This particular response has been deemed unnecessary
            // so discard it and move on.
            res.socket && res.socket.destroy();
            this.onComplete();
            return;
        }

        self = this;
        response = request.raw.res;
        response.once('error', this.onComplete);
        response.once('finish', this.onComplete);

        contentType = res.headers['content-type'];
        contentType = contentType && ContentType.parse(contentType).type; // lol

        if (contentType === 'application/octet-stream') {
            self._respond(new ReadableStream().wrap(res), res, reply);
        } else {
            Wreck.read(res, {}, function (err, payload) {
                var response;

                function onError(err) {
                    err = Boom.wrap(err);
                    err.output.headers['x-registry'] = self.registry;
                    reply(err);
                }

                function handleResponse(err, payload) {
                    var contentType, mime;

                    if (err) {
                        return onError(err);
                    }

                    if (payload.length !== 0) {
                        contentType = (res.headers && res.headers['content-type']) || '';
                        mime = contentType.split(';')[0].trim().toLowerCase();
                        if (/^application\/[a-z.+-]*json$/.test(mime)) {
                            try {
                                payload = JSON.parse(payload.toString());
                            } catch (err) {
                                return onError(err);
                            }
                        }
                    } else {
                        payload = null;
                    }

                    self._respond(payload, res, reply);
                }

                if (res.headers['content-encoding'] === 'gzip') {
                    Zlib.gunzip(payload, handleResponse);
                } else {
                    handleResponse(err, payload);
                }
            });
        }
    },

    _respond: function (obj, res, reply) {
        var response = reply(obj).code(res.statusCode);
        response.header('x-registry', this.registry);

        Object.keys(res.headers)
            .filter(Util.isValidHeader)
            .forEach(function (key) {
                response.header(key, res.headers[key]);
            });

        return response;
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
