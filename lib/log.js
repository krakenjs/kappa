/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2013 eBay Software Foundation                                │
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

var os = require('os');


var LogLevel = exports.LogLevel = (function () {
    var ord = 0;
    return {
        debug:   ord++,
        info:    ord++,
        notice:  ord++,
        warning: ord++,
        error:   ord++,
        crit:    ord++,
        alert:   ord++,
        emerg:   ord
    };
}());


var proto = {

    log: function (event, tags) {
        var level, stream, data;

        level = Object.keys(tags).reduce(function (curr, tag) {
            return Math.max(curr, LogLevel[tag] || null);
        }, LogLevel.debug);

        stream = (level < LogLevel.error) ? this._out : this._err;
        if (level >= LogLevel[this.level]) {
            // Deal with a couple basic data types
            data = event.data  || 'unspecified';
            if (typeof event.data === 'object') {
                data = JSON.stringify(data);
            }

            stream.write((new Date(event.timestamp)).toISOString() + ' ' + event.tags.map(function (tag) { return tag.toUpperCase(); }).join(',') + ' ' + data + os.EOL);
        }
    }

};



exports.createLogger = function (settings) {
    settings = settings || {};

    return Object.create(proto, {

        level: {
            value: settings.logLevel || 'debug',
            configurable: false,
            enumerable: true,
            writable: true
        },

        _out: {
            value: settings.out || process.stdout,
            configurable: false,
            enumerable: false,
            writable: false
        },

        _err: {
            value: settings.err || process.stderr,
            configurable: false,
            enumerable: false,
            writable: false
        }
    });

};