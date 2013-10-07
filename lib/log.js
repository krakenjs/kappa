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

var bunyan = require('bunyan');

//var LogLevel = exports.LogLevel = (function () {
//    var ord = 0;
//    return {
//        emerg:   ord++,
//        alert:   ord++,
//        crit:    ord++,
//        error:   ord++,
//        warning: ord++,
//        notice:  ord++,
//        info:    ord++,
//        debug:   ord
//    };
//}());

var LEVEL_NAMES, LEVEL_VALUES;

LEVEL_NAMES = {};
LEVEL_VALUES = [];

Object.keys(bunyan).reduce(function (levels, key) {
    var name, value;

    name = key.toLowerCase();
    value = bunyan[key];

    if (name !== 'log_version' && typeof value === 'number') {
        LEVEL_NAMES[name] = value;
        LEVEL_VALUES[value] = name;
    }
});


var proto = {

    log: function (event, tags) {
        var level, name;

        // Go through each tag and find the highest logging level.
        level = Object.keys(tags).reduce(function (prev, tag) {
            // NOTE: Can't use bunyan.resolveLevel b/c we don't even know if it's a valid level.
            var level = LEVEL_NAMES[tag.toLowerCase()];
            return (typeof level === 'number' && level > prev) ? level : prev;
        }, bunyan.TRACE);

        name = LEVEL_VALUES[level];
        this.logger[name](event);
    }

};



exports.createLogger = function (settings) {
    var level, out, err;

    settings = settings || {};
    level = settings.logLevel || 'debug';
    out = settings.out || process.stdout;
    err = settings.err || process.stderr;

    return Object.create(proto, {

        logger: {
            value: bunyan.createLogger({ name: settings.name || 'turnip' }),
            configurable: false,
            enumerable: false,
            writable: false
        },

        level: {
            value: level,
            configurable: false,
            enumerable: true,
            writable: true
        },

        _out: {
            value: out,
            configurable: false,
            enumerable: false,
            writable: false
        },

        _err: {
            value: err,
            configurable: false,
            enumerable: false,
            writable: false
        }
    });

};