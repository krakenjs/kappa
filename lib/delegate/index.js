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