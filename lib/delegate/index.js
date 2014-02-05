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

var hapi = require('hapi'),
    async = require('async'),
    factory = require('./proxy'),
    Iterator = require('./iterator');


exports.createHandler = function (registries) {

    return function (req, reply) {
        var iter = new Iterator(registries, factory);

        async.doWhilst(

            function iterator(callback) {
                var registry = iter.next();
                registry.oncomplete = callback;
                registry.proxy(req, reply);
            },

            function test() {
                // XXX: '_isReplied' is an internal hapi private member.
                // YMMV. CAVEAT EMPTOR. OMGWTFBBQ.
                return !req._isReplied && !iter.complete;
            },

            function complete(err) {
                if (!iter.complete && typeof reply === 'function') {
                    reply(err ? hapi.error.wrap(err) : hapi.error.notFound('Resource not found'));
                }
            }

        );
    };

};