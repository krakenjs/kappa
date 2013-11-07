/***@@@ BEGIN LICENSE @@@***
Copyright (c) 2013, eBay Software Foundation All rights reserved.  Use of the accompanying software, in source and binary forms, is permitted without modification only and provided that the following conditions are met:  Use of source code must retain the above copyright notice, this list of conditions and the following disclaimer.  Use in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.  Neither the name of eBay or its subsidiaries nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.  All rights not expressly granted to the recipient in this license are reserved by the copyright holder.  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
***@@@ END LICENSE @@@***/
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
exports.handler = function (req) {
    req.reply(data);
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