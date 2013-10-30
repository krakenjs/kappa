/*───────────────────────────────────────────────────────────────────────────*\
│  Copyright (C) 2013 eBay, Inc.                                              │
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

var url  = require('url'),
    Hapi = require('hapi'),
    http = require('http'),
    https = require('https'),
    async = require('async'),
    events = require('events'),
    assert = require('assert'),
    DevNull = require('./devnull');


var protocols, proto;

protocols = {
    'http:': {
        module: http,
        agent: new http.Agent({ maxSockets: 250 })
    },
    'https:': {
        module: https,
        agent: new https.Agent({ maxSockets: 250, rejectUnauthorized: false })
    }
};


proto = {

    __proto__: events.EventEmitter.prototype,

    get handler () {
        return this._handler.bind(this, this._registries);
    },

    _handler: function handler(registries, req) {
        var document, attempts, fulfilled;

        document = req.path.substring(1);
        attempts = 0;
        fulfilled = false;

        req.raw.res.on('finish', function () {
            fulfilled = true;
        });

        async.doWhilst(

            function (callback) {
                var registry, method, options, child;

                function error(err) {
                    child.removeListener('response', response);
                    callback(err);
                }

                function response(res) {
                    var moveNext, dest;
                    child.removeListener('error', error);

                    // Determine if we should move on to the next registry. If so, the current
                    // spawned child response gets piped to devnull and we move on.
                    moveNext = attempts < registries.length && res.statusCode === 404;
                    dest = moveNext ? new DevNull() : req.raw.res;
                    dest.on('error', callback);
                    dest.on('finish', callback);

                    pipe(res, dest);
                }

                registry = registries[attempts];
                method = req.method.toLowerCase();

                options = url.parse(url.resolve(registry, document));
                options.method = method;
                options.agent = protocols[options.protocol].agent;

                // Copy headers, deleting host. The correct host header (different from
                // this host) is automatically added by node http internals.
                options.headers = Hapi.utils.clone(req.raw.req.headers);
                delete options.headers.host;

                // HACK: Only ever send auth to first server.
                // This is a unique situation where, for writes we ONLY go to a single
                // repo so this is a noop, but for GETs we fallback to others. If we
                // fallback, we don't want our Basic auth headers sent to downstream
                // services since 1) they won't be of any use, and 2) they expose us.
                attempts > 0 && delete options.headers.authorization;

                // Spawn the child request
                child = protocols[options.protocol].module.request(options);
                child.once('error', error);
                child.once('response', response);
                child.setTimeout(5000, child.abort.bind(child));
                req.raw.req.pipe(child);

                attempts += 1;
            },

            function () {
                return !fulfilled;
            },

            function (err) {
                if (!fulfilled && typeof req.reply === 'function') {
                    req.reply(err || Hapi.error.notFound('Resource not found'))
                }
            }

        )

    }

};

exports.createHandler = function (registries) {

    var handler = Object.create(proto, {

        _registries: {
            value: validate(registries),
            enumerable: true
        }

    });

    events.EventEmitter.apply(handler);
    return handler;
};



/**
 * Ensures the provided uri is http[s]
 * @param registries
 * @returns {*}
 */
function validate(registries) {
    return registries.map(function (uri) {
        var parsed = url.parse(uri);

        if (!(url.parse(uri).protocol in protocols)) {
            throw new Error('Unsupported protocol: \'' + parsed.protocol + '\'');
        }

        return uri;
    });
}


/**
* Pipes a src response to a dest response
* @param src
* @param dest
*/
function pipe(src, dest) {
    dest.statusCode = src.statusCode;

    Object.keys(src.headers).forEach(function (header) {
        dest.setHeader(header, src.headers[header]);
    });

    src.pipe(dest);
}

