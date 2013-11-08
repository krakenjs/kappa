/***@@@ BEGIN LICENSE @@@***
Copyright (c) 2013, eBay Software Foundation All rights reserved.  Use of the accompanying software, in source and binary forms, is permitted without modification only and provided that the following conditions are met:  Use of source code must retain the above copyright notice, this list of conditions and the following disclaimer.  Use in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.  Neither the name of eBay or its subsidiaries nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.  All rights not expressly granted to the recipient in this license are reserved by the copyright holder.  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
***@@@ END LICENSE @@@***/
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