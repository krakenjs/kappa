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

var os = require('os'),
    util = require('./util');


// XXX: This is NOT built to be used in a clustered scenario just yet.

var OS_STATS = ['hostname', 'loadavg', 'totalmem', 'freemem'];
var samples, data;
samples = {};
data = {
    samples: undefined,
    counters: {}
};



/**
 * The HAPI request handler for serving stats.
 * @param req
 */
exports.handler = function (req, reply) {
    reply(data);
};


exports.increment = util.init(data.counters, function (obj, prop) {
    obj[prop] += 1;
});


exports.decrement = util.maybe(data.counters, function (obj, prop) {
    obj[prop] -= 1;
});


exports.sample = function (name, fn) {
    util.ns(samples, function (obj, name) {
        obj[name] = fn;
    })(name);
};




/**
 * Manages aggregating all the relevant info
 */
function calculate() {
    OS_STATS.reduce(function (data, stat) {
        data[stat] = os[stat]();
        return data;
    }, data);

    data.memoryUsage = process.memoryUsage();
    data.samples = util.map(samples, function (value) {
        if (typeof value === 'function') {
            return value();
        }
        return value;
    });

    setTimeout(calculate, 5000);
}

calculate();