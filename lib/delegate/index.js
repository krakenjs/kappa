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

var Hapi = require('hapi');
var async = require('async');
var Boom = require('boom');
var factory = require('./proxy');
var Iterator = require('./iterator');

exports.createHandler = function (registries) {

    return function (req, reply) {
        var good, start;
        var iter = new Iterator(registries, factory);

        if (good = req.server.plugins.good) {
            start = Date.now();
            req.raw.res.once('timeout', function () {
                var end = Date.now();
                good.monitor.emit('report', 'timeout', {
                    timestamp: end,
                    event: 'timeout',
                    duration: end - start,
                    method: req.method,
                    path: req.path,
                    id: req.id,
                    tags:'timeout',
                    data: {}
                });

                req.raw.res.socket.destroy();
            });
        }

        async.doWhilst(

            function iterator(callback) {
                var registry = iter.next();
                registry.proxy(req, reply);
                registry.onComplete = callback;
            },

            function test() {
                // XXX: '_isReplied' is an internal Hapi private member.
                // YMMV. CAVEAT EMPTOR. OMGWTFBBQ.
                return !req._isReplied && !iter.complete;
            },

            function complete(err) {
                // If the request has been replied to calls to `reply` are a noop.
                reply(err ? Boom.wrap(err) : Boom.notFound('Resource not found'));
            }

        );
    };

};
