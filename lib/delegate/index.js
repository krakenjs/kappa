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

var Hapi = require('hapi'),
    async = require('async'),
    stats = require('../stats'),
    factory = require('./proxy'),
    Iterator = require('./iterator');


exports.createHandler = function (registries) {

    return function (req) {
        var iter = new Iterator(registries, factory);

        stats.increment('http:requests:total');
        stats.increment('http:requests:active');

        async.doWhilst(

            function iterator(callback) {
                var registry = iter.next();
                registry.oncomplete = callback;
                registry.proxy(req);
            },

            function test() {
                // XXX: '_isReplied' is an internal Hapi private member.
                // YMMV. CAVEAT EMPTOR. OMGWTFBBQ.
                return !req._isReplied && !iter.complete;
            },

            function complete(err) {
                stats.decrement('http:requests:active');

                if (!iter.complete && typeof req.reply === 'function') {
                    if (err) {
                        stats.increment('http:errors');
                        req.log('error', err.message, err.stack || '');
                    }
                    req.reply(err || Hapi.error.notFound('Resource not found'))
                }
            }

        );
    };

};