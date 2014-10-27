'use strict';

var test = require('tape');
var Hapi = require('hapi');
var kappa = require('../');
var stats = require('../lib/stats');


function wait(duration, fn) {
    return function () {
        var args;
        args = Array.prototype.slice.call(arguments);
        args.unshift(null);
        setTimeout(Function.prototype.bind.apply(fn, args), duration);
    };
}

test('stats', wait(6000, function (t) {

    t.test('handler', function (t) {
        stats.handler(null, function (stats) {
            t.equal(typeof stats, 'object');
            t.equal(typeof stats.counters, 'object');
            t.equal(typeof stats.hostname, 'string');
            t.equal(typeof stats.loadavg,  'object');
            t.equal(typeof stats.totalmem, 'number');
            t.end();
        });
    });

    t.test('increment', function (t) {
        stats.increment('foo');
        stats.handler(null, function (stats) {
            t.equal(typeof stats, 'object');
            t.equal(typeof stats.counters, 'object');
            t.equal(stats.counters.foo, 1);
            t.end();
        });
    });

    t.test('decrement', function (t) {
        stats.decrement('foo');
        stats.handler(null, function (stats) {
            t.equal(typeof stats, 'object');
            t.equal(typeof stats.counters, 'object');
            t.equal(stats.counters.foo, 0);
            t.end();
        });
    });

}));
